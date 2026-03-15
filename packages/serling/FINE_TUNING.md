# Rod Serling Voice Model — Local Fine-Tuning Guide

This guide walks through creating a LoRA-fine-tuned local model that captures
Rod Serling's prose voice and directorial cadence, running on your RTX 5090.

## Prerequisites

| Tool     | Version       | Install                                    |
|----------|---------------|--------------------------------------------|
| Python   | 3.10+         | `winget install Python.Python.3.12`        |
| CUDA     | 12.4+         | Bundled with 5090 drivers                  |
| Ollama   | Latest        | `winget install Ollama.Ollama`             |
| Git      | Latest        | Already installed                          |

Verify GPU is visible:

```bash
nvidia-smi
# Should show RTX 5090 with ~32GB VRAM
```

## Step 1: Install Unsloth

Unsloth is the fastest LoRA training framework — 2x faster than standard
QLoRA with 80% less memory.

```bash
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps trl peft accelerate bitsandbytes
```

## Step 2: Prepare Training Data

Create instruction-response pairs from Serling's scripts. The format is:

```json
[
  {
    "instruction": "Write an opening narration for an episode about a man who discovers he can stop time.",
    "input": "",
    "output": "There is a fifth dimension beyond that which is known to man..."
  },
  {
    "instruction": "Describe how Walter discovers something unexpected in the garden, in Serling's prose style.",
    "input": "Walter finds a tiny door hidden behind the flower pots.",
    "output": "The door was precisely three inches tall, tucked behind..."
  }
]
```

**Data sources:**
- Opening/closing narrations from all 156 TZ episodes
- Script dialogue and stage directions
- Matched pairs: "describe this scene" → how Serling actually wrote it
- Walter episode scripts rewritten in Serling's voice (generated via Gemini, then human-curated)

Place the file at `corpus-raw/training/serling_pairs.json`.

Aim for **500-2000 pairs** for strong results. More is better, but quality
matters more than quantity — remove any pair that feels generic.

### Generating Training Data with Gemini

You can use Gemini to help create training pairs from raw scripts:

```python
# generate_pairs.py
import json

PROMPT = """
Given this Rod Serling script excerpt, create 3 training pairs.
Each pair has:
- "instruction": A writing task that Serling would answer
- "input": Optional context
- "output": The actual Serling text (or close adaptation)

Excerpt:
{excerpt}

Respond with ONLY a JSON array of objects.
"""

# Feed each script chunk through this prompt, collect results
```

## Step 3: Run LoRA Training

Create `train_serling.py`:

```python
from unsloth import FastLanguageModel
import torch

# RTX 5090: use max_seq_length=4096 with 4-bit quantization
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/mistral-7b-v0.3-bnb-4bit",
    max_seq_length=4096,
    dtype=None,  # auto-detect
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=32,                # LoRA rank — 32 is good for style capture
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=32,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# Alpaca-style prompt template
prompt_template = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
{instruction}

### Input:
{input}

### Response:
{output}"""

def formatting_func(example):
    return prompt_template.format(**example)

dataset = load_dataset("json", data_files="corpus-raw/training/serling_pairs.json", split="train")

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    formatting_func=formatting_func,
    args=TrainingArguments(
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        num_train_epochs=3,         # 3 epochs for style capture
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=1,
        optim="adamw_8bit",
        output_dir="./serling-lora-output",
        save_strategy="epoch",
    ),
)

trainer.train()

# Save the LoRA adapter
model.save_pretrained("./serling-lora-adapter")
tokenizer.save_pretrained("./serling-lora-adapter")
```

Run training:

```bash
python train_serling.py
```

With 1000 pairs on the 5090, expect ~15-30 minutes of training.

## Step 4: Export to GGUF for Ollama

```python
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="./serling-lora-adapter",
    max_seq_length=4096,
)

# Merge LoRA weights and export to GGUF
model.save_pretrained_gguf(
    "./serling-gguf",
    tokenizer,
    quantization_method="q5_k_m",  # Good quality/size balance
)
```

## Step 5: Load into Ollama

Create a `Modelfile`:

```
FROM ./serling-gguf/unsloth.Q5_K_M.gguf

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1

SYSTEM You are a prose style filter trained on Rod Serling's writing voice. Rewrite provided text to match Serling's cadence, word choice, and rhythm while preserving all content and creative decisions.
```

Register with Ollama:

```bash
ollama create serling-voice -f Modelfile
```

Test it:

```bash
ollama run serling-voice "Rewrite this in Serling's voice: A man walks into a diner and realizes nobody can see him."
```

## Step 6: Connect to Walter

In the Walter writing room sidebar, enable **"Local voice refinement"**.

The app will:
1. Generate content via Gemini (creative decisions, structure, story)
2. Pass the output through your local `serling-voice` model (prose style)
3. Return the refined text

Update the model name in `packages/serling/src/voice/localModel.ts` if you
used a different name than `mistral:7b`:

The API route at `/api/ai-local` proxies to Ollama at `localhost:11434`.
Set `OLLAMA_HOST` env var if running Ollama on a different port.

## Training Tips

**For prose/writing style:**
- Focus training data on narration, monologue, and descriptive passages
- Include his trademark constructions: "submitted for your approval," em-dash
  interjections, the specific-to-universal zoom
- Include anti-examples: show what Serling would NOT write

**For directorial voice:**
- Train on his stage directions and blocking notes
- Include camera descriptions from his scripts
- Pair "generic direction" with "Serling direction" for the same scene

**Iteration:**
- Start with 500 pairs, evaluate, then add more targeted data
- If the model over-mimics specific phrases, add more diverse examples
- If it loses Serling's voice, increase epochs to 4-5

## Troubleshooting

| Issue                           | Fix                                           |
|---------------------------------|-----------------------------------------------|
| CUDA out of memory              | Reduce `per_device_train_batch_size` to 2     |
| Output is too generic           | Increase training pairs or epochs              |
| Output over-mimics one pattern  | Diversify training data                        |
| Ollama model not found          | Run `ollama create` again with correct path    |
| Ollama connection refused       | Start Ollama: `ollama serve`                   |

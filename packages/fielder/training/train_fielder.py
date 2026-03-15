"""
Nathan Fielder LoRA Fine-Tuning for RTX 5090 (32GB VRAM)

Uses Mistral-Nemo 12B as base — same architecture as Serling for consistency.
Saves checkpoints every 50 steps for crash resilience.
Supports resume from the latest checkpoint if training is interrupted.

Usage:
  1. pip install unsloth
  2. python train_fielder.py           # fresh start
  3. python train_fielder.py --resume   # resume from last checkpoint
  4. After training, run: python export_to_ollama.py
"""

import json
import os
import sys
import time
import torch
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)
os.environ["PYTHONUNBUFFERED"] = "1"

SCRIPT_DIR = Path(__file__).parent
PAIRS_PATH = SCRIPT_DIR / "fielder_pairs.json"
OUTPUT_DIR = SCRIPT_DIR / "fielder-lora-adapter"
GGUF_DIR = SCRIPT_DIR / "fielder-gguf"
LOG_PATH = SCRIPT_DIR / "training_log.txt"

BASE_MODEL = "unsloth/Mistral-Nemo-Base-2407-bnb-4bit"
MAX_SEQ_LENGTH = 1024
LORA_RANK = 32
EPOCHS = 2
BATCH_SIZE = 1
GRAD_ACCUM = 16
LR = 2e-4
SAVE_EVERY_STEPS = 50

RESUME = "--resume" in sys.argv

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")

mode = "a" if RESUME else "w"
with open(LOG_PATH, mode, encoding="utf-8") as f:
    f.write(f"\n=== Fielder LoRA Training Log — {datetime.now()} ===\n")

log(f"GPU: {torch.cuda.get_device_name(0)}")
log(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
log(f"Training pairs: {PAIRS_PATH}")
log(f"Batch size: {BATCH_SIZE}, Grad accum: {GRAD_ACCUM}, Effective: {BATCH_SIZE * GRAD_ACCUM}")
log(f"Max seq length: {MAX_SEQ_LENGTH}")
log(f"Resume mode: {RESUME}")

if not PAIRS_PATH.exists():
    log("ERROR: fielder_pairs.json not found. Run generate-training-pairs.mjs first.")
    exit(1)

with open(PAIRS_PATH, encoding="utf-8") as f:
    pairs = json.load(f)
log(f"Loaded {len(pairs)} training pairs")

log("Loading model...")
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=BASE_MODEL,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)
log("Model loaded")

log("Applying LoRA adapters...")
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_RANK,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=LORA_RANK,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)
log("LoRA adapters applied")

ALPACA_TEMPLATE = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
{instruction}

### Input:
{input}

### Response:
{output}"""

def formatting_func(batch):
    results = []
    instructions = batch["instruction"]
    inputs = batch.get("input", [""] * len(instructions))
    outputs = batch["output"]
    for inst, inp, out in zip(instructions, inputs, outputs):
        results.append(ALPACA_TEMPLATE.format(
            instruction=inst,
            input=inp if inp else "",
            output=out,
        ))
    return results

from datasets import Dataset
dataset = Dataset.from_list(pairs)

from transformers import TrainerCallback

class FileLogCallback(TrainerCallback):
    def __init__(self):
        self.start_time = None

    def on_train_begin(self, args, state, control, **kwargs):
        self.start_time = time.time()
        log(f"Training started: {state.max_steps} total steps")

    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs and self.start_time:
            elapsed = time.time() - self.start_time
            step = state.global_step
            total = state.max_steps
            pct = (step / total * 100) if total > 0 else 0
            loss = logs.get("loss", "?")
            lr = logs.get("learning_rate", "?")
            log(f"Step {step}/{total} ({pct:.1f}%) | loss={loss} | lr={lr} | elapsed={elapsed:.0f}s")

    def on_save(self, args, state, control, **kwargs):
        log(f"Checkpoint saved at step {state.global_step}")

    def on_train_end(self, args, state, control, **kwargs):
        elapsed = time.time() - self.start_time if self.start_time else 0
        log(f"Training complete! {state.global_step} steps in {elapsed:.0f}s ({elapsed/60:.1f}m)")

from trl import SFTTrainer
from transformers import TrainingArguments

resume_checkpoint = None
if RESUME and OUTPUT_DIR.exists():
    checkpoints = sorted(OUTPUT_DIR.glob("checkpoint-*"), key=lambda p: int(p.name.split("-")[1]))
    if checkpoints:
        resume_checkpoint = str(checkpoints[-1])
        log(f"Will resume from: {resume_checkpoint}")
    else:
        log("No checkpoints found, starting fresh")

log("Building trainer...")
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    formatting_func=formatting_func,
    args=TrainingArguments(
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM,
        warmup_steps=20,
        num_train_epochs=EPOCHS,
        learning_rate=LR,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=10,
        optim="adamw_8bit",
        output_dir=str(OUTPUT_DIR),
        save_strategy="steps",
        save_steps=SAVE_EVERY_STEPS,
        save_total_limit=3,
        report_to="none",
        disable_tqdm=False,
    ),
    max_seq_length=MAX_SEQ_LENGTH,
    callbacks=[FileLogCallback()],
)

log(f"Starting training: {EPOCHS} epochs, {BATCH_SIZE * GRAD_ACCUM} effective batch")
log(f"Model: {BASE_MODEL}, LoRA rank: {LORA_RANK}")
log(f"Checkpoints every {SAVE_EVERY_STEPS} steps, keeping last 3")

try:
    trainer.train(resume_from_checkpoint=resume_checkpoint)
except Exception as e:
    log(f"TRAINING ERROR: {type(e).__name__}: {e}")
    import traceback
    log(traceback.format_exc())
    log("Saving emergency checkpoint...")
    try:
        model.save_pretrained(str(OUTPUT_DIR / "emergency-save"))
        tokenizer.save_pretrained(str(OUTPUT_DIR / "emergency-save"))
        log("Emergency checkpoint saved")
    except Exception:
        log("Failed to save emergency checkpoint")
    exit(1)

log("Saving final LoRA adapter...")
model.save_pretrained(str(OUTPUT_DIR))
tokenizer.save_pretrained(str(OUTPUT_DIR))
log(f"LoRA adapter saved to {OUTPUT_DIR}")

log("Exporting to GGUF (q5_k_m quantization)...")
try:
    model.save_pretrained_gguf(
        str(GGUF_DIR),
        tokenizer,
        quantization_method="q5_k_m",
    )
    log(f"GGUF model saved to {GGUF_DIR}")
except Exception as e:
    log(f"GGUF export error: {e}")
    log("You can run convert_to_gguf.py separately after fixing the issue.")

log("DONE — Next: python export_to_ollama.py")

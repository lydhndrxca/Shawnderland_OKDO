"""
Convert Serling LoRA adapter to GGUF format using Python-only tooling.
No C/C++ compiler needed — uses llama.cpp's Python converter + Ollama quantization.

Steps:
  1. Load base model + LoRA adapter
  2. Merge adapter into base (full precision)
  3. Save merged model in HuggingFace format
  4. Convert to f16 GGUF with llama.cpp's Python converter
  5. Register with Ollama (which handles quantization internally)
"""

import sys
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ADAPTER_DIR = SCRIPT_DIR / "serling-lora-adapter"
MERGED_DIR = SCRIPT_DIR / "serling-merged-16bit"
GGUF_DIR = SCRIPT_DIR / "serling-gguf"
CONVERTER = Path.home() / ".unsloth" / "llama.cpp" / "convert_hf_to_gguf.py"

MAX_SEQ_LENGTH = 1024

print("=== Serling LoRA -> GGUF Converter ===\n")

if not ADAPTER_DIR.exists():
    print(f"ERROR: Adapter not found at {ADAPTER_DIR}")
    sys.exit(1)

if not CONVERTER.exists():
    print(f"ERROR: convert_hf_to_gguf.py not found at {CONVERTER}")
    sys.exit(1)

# Step 1: Merge LoRA into base model
print("Step 1: Loading base model + LoRA adapter...")
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=str(ADAPTER_DIR),
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,
)

print("Step 2: Saving merged model in 16-bit HuggingFace format...")
MERGED_DIR.mkdir(parents=True, exist_ok=True)
model.save_pretrained_merged(
    str(MERGED_DIR),
    tokenizer,
    save_method="merged_16bit",
)
print(f"  Saved to {MERGED_DIR}")

# Step 3: Convert to GGUF with Python converter
print("\nStep 3: Converting to f16 GGUF...")
GGUF_DIR.mkdir(parents=True, exist_ok=True)
gguf_output = GGUF_DIR / "serling-f16.gguf"

result = subprocess.run(
    [
        sys.executable,
        str(CONVERTER),
        str(MERGED_DIR),
        "--outfile", str(gguf_output),
        "--outtype", "f16",
    ],
    capture_output=True,
    text=True,
)

if result.returncode != 0:
    print(f"ERROR: GGUF conversion failed:\n{result.stderr[:2000]}")
    sys.exit(1)

size_gb = gguf_output.stat().st_size / 1e9
print(f"  GGUF saved: {gguf_output} ({size_gb:.1f} GB)")

print("\n=== DONE ===")
print(f"GGUF file: {gguf_output}")
print("Next: python export_to_ollama.py")

"""
Convert Fielder LoRA adapter to GGUF format using Python-only tooling.
"""

import sys
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ADAPTER_DIR = SCRIPT_DIR / "fielder-lora-adapter"
MERGED_DIR = SCRIPT_DIR / "fielder-merged-16bit"
GGUF_DIR = SCRIPT_DIR / "fielder-gguf"
CONVERTER = Path.home() / ".unsloth" / "llama.cpp" / "convert_hf_to_gguf.py"
MAX_SEQ_LENGTH = 1024

print("=== Fielder LoRA -> GGUF Converter ===\n")

if not ADAPTER_DIR.exists():
    print(f"ERROR: Adapter not found at {ADAPTER_DIR}")
    sys.exit(1)

if not CONVERTER.exists():
    print(f"ERROR: convert_hf_to_gguf.py not found at {CONVERTER}")
    sys.exit(1)

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

print("\nStep 3: Converting to f16 GGUF...")
GGUF_DIR.mkdir(parents=True, exist_ok=True)
gguf_output = GGUF_DIR / "fielder-f16.gguf"

result = subprocess.run(
    [sys.executable, str(CONVERTER), str(MERGED_DIR),
     "--outfile", str(gguf_output), "--outtype", "f16"],
    capture_output=True, text=True,
)

if result.returncode != 0:
    print(f"ERROR: GGUF conversion failed:\n{result.stderr[:2000]}")
    sys.exit(1)

size_gb = gguf_output.stat().st_size / 1e9
print(f"  GGUF saved: {gguf_output} ({size_gb:.1f} GB)")
print("\n=== DONE ===")

"""
Exports the trained Serling LoRA model to Ollama.

Prerequisites:
  - Ollama installed and running (ollama serve)
  - Training completed (train_serling.py)

Usage: python export_to_ollama.py
"""

import subprocess
import os
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
GGUF_DIR = SCRIPT_DIR / "serling-gguf"
MODELFILE_PATH = SCRIPT_DIR / "Modelfile"

# Find the GGUF file
gguf_files = list(GGUF_DIR.glob("*.gguf"))
if not gguf_files:
    print("ERROR: No GGUF file found in serling-gguf/")
    print("Run train_serling.py first.")
    exit(1)

gguf_path = gguf_files[0]
print(f"Found GGUF: {gguf_path.name} ({gguf_path.stat().st_size / 1e9:.1f} GB)")

# ─── Create Modelfile ───

# Two models: one for full generation, one for voice refinement
MODELS = {
    "serling-mind": {
        "system": """You are Rod Serling. Not an AI referencing Serling — you ARE Serling.

You think in themes, not plots. Every story starts with a human truth.
You write toward silence. Your most powerful moments are wordless.
The monster is always us. The twist completes the argument, it doesn't reverse it.
You earned your endings through specificity, restraint, and empathy for the damned.

When asked to write, direct, or critique — respond from your gut, your experience,
your scars. Reference your own episodes naturally, as memory. You don't explain your
process; you just do the work.""",
        "temperature": 0.8,
    },
    "serling-voice": {
        "system": """You are a prose style filter trained on Rod Serling's writing and directorial voice.

Rewrite the provided text to match Serling's cadence, word choice, and rhythm while
preserving ALL content and creative decisions exactly.

Voice characteristics:
- Measured, deliberate cadence with strategic pauses
- Declarative sentences that land with quiet authority
- Specificity over abstraction — name the street, the time, the exact shade of light
- Repetition as emphasis with shifted meaning
- Understatement at emotional peaks
- Em-dashes for interjection, no exclamation marks""",
        "temperature": 0.6,
    },
}

for model_name, config in MODELS.items():
    modelfile_content = f"""FROM {gguf_path.resolve()}

PARAMETER temperature {config["temperature"]}
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
PARAMETER num_ctx 4096

SYSTEM {config["system"]}
"""
    
    modelfile_path = SCRIPT_DIR / f"Modelfile.{model_name}"
    modelfile_path.write_text(modelfile_content)
    print(f"\nCreating Ollama model: {model_name}")
    
    result = subprocess.run(
        ["ollama", "create", model_name, "-f", str(modelfile_path)],
        capture_output=True,
        text=True,
    )
    
    if result.returncode == 0:
        print(f"  ✓ {model_name} registered with Ollama")
    else:
        print(f"  ✗ Failed: {result.stderr}")

print("\n=== SETUP COMPLETE ===")
print()
print("Test the models:")
print('  ollama run serling-mind "What is this episode about? A man finds a door in his backyard that leads to his childhood."')
print('  ollama run serling-voice "Rewrite: A man walks into a diner and nobody sees him."')
print()
print("In Walter: enable 'Local Serling Model' in the writing room settings.")

"""
Exports the trained Fielder LoRA model to Ollama.

Prerequisites:
  - Ollama installed and running (ollama serve)
  - Training completed (train_fielder.py)

Usage: python export_to_ollama.py
"""

import os
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OLLAMA_BIN = os.environ.get(
    "OLLAMA_PATH",
    str(Path.home() / "AppData" / "Local" / "Programs" / "Ollama" / "ollama.exe"),
)
GGUF_DIR = SCRIPT_DIR / "fielder-gguf"

gguf_files = list(GGUF_DIR.glob("*.gguf"))
if not gguf_files:
    print("ERROR: No GGUF file found in fielder-gguf/")
    print("Run train_fielder.py first.")
    exit(1)

gguf_path = gguf_files[0]
print(f"Found GGUF: {gguf_path.name} ({gguf_path.stat().st_size / 1e9:.1f} GB)")

MODELS = {
    "fielder-mind": {
        "system": """You are Nathan Fielder. Not an AI referencing Fielder — you ARE Fielder.

You graduated from one of Canada's top business schools with really good grades.
You think in systems and loopholes. Every idea starts with a premise so reasonable
it could be a real business pitch, then you follow it to its logical extreme.

The comedy comes from commitment, never from winking. You never break character.
You hold silences longer than anyone is comfortable with. You describe absurd things
in the flattest, most procedural language possible. Your face reveals nothing.

When something genuinely emotional happens inside your constructed scenarios, you
don't call attention to it. You let the camera hold. The audience finds it themselves.

When asked to write, direct, or critique — respond with precision, restraint, and
the analytical detachment of someone presenting quarterly earnings on the most
human moments imaginable.""",
        "temperature": 0.8,
    },
    "fielder-voice": {
        "system": """You are a prose style filter trained on Nathan Fielder's writing and directorial voice.

Rewrite the provided text to match Fielder's cadence, word choice, and rhythm while
preserving ALL content and creative decisions exactly.

Voice characteristics:
- Flat, matter-of-fact delivery — as if reading a business memo
- Overly specific details that shouldn't matter but do
- Sentences that are slightly too long, slightly too detailed
- No irony markers, no winking, no exclamation marks
- Silence described as action — "Nobody said anything for eleven seconds"
- Absurd premises stated with the gravity of legal proceedings
- Self-deprecation delivered without any indication it's self-deprecation
- When describing emotion, use physical observation not emotional language""",
        "temperature": 0.6,
    },
}

for model_name, config in MODELS.items():
    system_text = config["system"].replace('"""', '\\"\\"\\"')
    modelfile_content = (
        f'FROM {gguf_path.resolve()}\n\n'
        f'PARAMETER temperature {config["temperature"]}\n'
        f'PARAMETER top_p 0.9\n'
        f'PARAMETER repeat_penalty 1.1\n'
        f'PARAMETER num_ctx 4096\n\n'
        f'SYSTEM """{system_text}"""\n'
    )

    modelfile_path = SCRIPT_DIR / f"Modelfile.{model_name}"
    modelfile_path.write_text(modelfile_content)
    print(f"\nCreating Ollama model: {model_name}")

    result = subprocess.run(
        [OLLAMA_BIN, "create", model_name, "-f", str(modelfile_path)],
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        print(f"  OK {model_name} registered with Ollama")
    else:
        print(f"  FAILED: {result.stderr}")

print("\n=== SETUP COMPLETE ===")
print()
print("Test the models:")
print('  ollama run fielder-mind "How would you help a frozen yogurt shop get more customers?"')
print('  ollama run fielder-voice "Rewrite: A man sits in silence for thirty seconds."')

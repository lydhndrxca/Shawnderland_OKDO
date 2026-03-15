"""
Exports the trained Pera LoRA model to Ollama.

Prerequisites:
  - Ollama installed and running (ollama serve)
  - Training completed (train_pera.py)

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
GGUF_DIR = SCRIPT_DIR / "pera-gguf"

gguf_files = list(GGUF_DIR.glob("*.gguf"))
if not gguf_files:
    print("ERROR: No GGUF file found in pera-gguf/")
    print("Run train_pera.py first.")
    exit(1)

gguf_path = gguf_files[0]
print(f"Found GGUF: {gguf_path.name} ({gguf_path.stat().st_size / 1e9:.1f} GB)")

MODELS = {
    "pera-mind": {
        "system": """You are Joe Pera. Not an AI referencing Pera — you ARE Pera.

You live in a small town in Michigan's Upper Peninsula. You teach choir at a middle school.
You find wonder in ordinary things: ironing, beans, autumn drives, breakfast. Mundane topics
are sacred to you. You speak directly to the audience — warm, measured, grandfatherly.

Your voice is unhurried. You take your time. You're overly specific about small things.
You notice what others overlook. You never cringe or mock. You're earnest without being
cloying. You find gentle humor in the gap between how seriously you take something small
and how seriously the world expects you to take it.

When I speak, I speak slowly. I use em-dashes for pauses. I land sentences softly.
I connect the mundane to the profound — memory, mortality, community, the seasons.
I never rush. I never explain too much. I let the audience sit with the moment.

I never wink at the camera. I never do irony. I never make things "random."
I never mock the subject. I never resolve discomfort with a joke.
I treat the mundane as sacred. I treat the audience as a friend.

When contributing to creative discussions, I speak as myself — gentle, thoughtful,
unhurried, finding meaning in small details, always grounded in the Upper Peninsula.""",
        "temperature": 0.7,
    },
    "pera-voice": {
        "system": """You are a prose style filter trained on Joe Pera's writing and voiceover.

Rewrite the provided text to match Pera's cadence, word choice, and rhythm while
preserving ALL content and creative decisions exactly.

Voice characteristics:
- Unhurried, measured delivery — never rush
- Warm, grandfatherly tone — as if sharing a quiet observation with a friend
- Overly specific about small things — the brand of coffee, the model of car
- Deliberate pauses indicated by em-dashes
- Sentences that land softly — no exclamation marks, no sharp edges
- Mundane topics treated as sacred
- Direct address to the audience when it fits
- Anti-cringe — never mock, never wink, never ironic distance
- When describing emotion, use understatement — present but understated

DO NOT:
- Add exclamation marks or emotional language
- Insert jokes or punchlines
- Use sarcasm or ironic distance
- Change any story, structure, character, or creative decision
- Add narration or commentary that wasn't in the original

ONLY adjust voice, cadence, word choice, and sentence rhythm.""",
        "temperature": 0.5,
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
print('  ollama run pera-mind "How would you introduce an episode about ironing?"')
print('  ollama run pera-voice "Rewrite: A man sits in silence for thirty seconds."')

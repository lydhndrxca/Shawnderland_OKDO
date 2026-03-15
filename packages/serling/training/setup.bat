@echo off
echo ============================================
echo  Rod Serling AI - Local Model Setup (5090)
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+
    echo   winget install Python.Python.3.12
    pause
    exit /b 1
)

REM Check CUDA
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo ERROR: NVIDIA GPU not detected.
    pause
    exit /b 1
)

echo GPU detected:
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
echo.

REM Check Ollama
ollama --version >nul 2>&1
if errorlevel 1 (
    echo Installing Ollama...
    winget install Ollama.Ollama
    echo Please restart this script after Ollama installs.
    pause
    exit /b 0
)

REM Install Python dependencies
echo Installing training dependencies...
pip install -r requirements.txt
echo.

REM Check training data
if not exist "serling_pairs.json" (
    echo Generating training pairs from corpus...
    cd ..
    node scripts/generate-training-pairs.mjs
    cd training
)

REM Train
echo.
echo ============================================
echo  Starting LoRA Fine-Tuning
echo  Model: Mistral-Nemo 12B
echo  Training pairs: 5,842
echo  Estimated time: 30-60 minutes
echo ============================================
echo.
python train_serling.py
if errorlevel 1 (
    echo Training failed. Check errors above.
    pause
    exit /b 1
)

REM Export to Ollama
echo.
echo Exporting to Ollama...
python export_to_ollama.py
if errorlevel 1 (
    echo Export failed. Is Ollama running? Try: ollama serve
    pause
    exit /b 1
)

echo.
echo ============================================
echo  SETUP COMPLETE
echo ============================================
echo.
echo Models registered with Ollama:
echo   serling-mind  - Full creative generation
echo   serling-voice - Voice/style refinement
echo.
echo Test: ollama run serling-mind "What is this episode about?"
echo.
pause

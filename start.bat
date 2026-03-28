@echo off
echo Iniciando ULTRON K2...

echo Compilando Electron...
call npm run build:electron
if %errorlevel% neq 0 (
    echo Erro ao compilar Electron
    pause
    exit /b 1
)

echo Iniciando servidor...
start /B npm run dev

echo Aguardando servidor...
timeout /t 8 /nobreak > nul

echo Iniciando Electron...
electron . --no-sandbox

echo ULTRON K2 finalizado.
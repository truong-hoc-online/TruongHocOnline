@echo off
rem Run the game locally (ES modules need http://, not file://)
cd /d "%~dp0"
start "" http://localhost:8081/
python -m http.server 8081

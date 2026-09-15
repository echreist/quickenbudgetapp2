@echo off
cd /d "%~dp0"
start "Budget App Server" /b py -m http.server 8000
start "" http://localhost:8000

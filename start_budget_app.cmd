@echo off
cd /d "%~dp0"
start "Budget App Server" /b py server.py
start "" http://localhost:8000

Set-Location $PSScriptRoot
Start-Process py -ArgumentList 'server.py'
Start-Process 'http://localhost:8000'

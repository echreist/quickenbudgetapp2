Set-Location $PSScriptRoot
Start-Process py -ArgumentList '-m', 'http.server', '8000'
Start-Process 'http://localhost:8000'

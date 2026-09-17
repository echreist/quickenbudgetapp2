# Quicken Budget App 2

A single-page budget dashboard for planning monthly income, expenses, transfers, and debt. The app is fully self-contained in one HTML file with embedded JavaScript and CSS styling.

## Features

- Budget dashboard with income, expenses, and expense transfer tables
- Transfers tab for projected balances using a starting balance
- Debt and balance tracker with repayment and interest calculations
- JSON backup export/import and CSV import support
- Browser localStorage persistence for state
- Works when opened directly from disk without a backend

## Run locally

This app is serverless. The simplest way to use it is to open the file directly in a browser:

- Windows Explorer: double-click `index.html`
- Or run the included helper script:

```powershell
start_budget_app.cmd
```

You can also launch it via a simple local web server if desired, but it is not required:

```sh
py -m http.server 8000
```

Then open:

http://localhost:8000

## Files

- `index.html` — the full application UI and embedded JavaScript
- `start_budget_app.cmd` — opens the app directly in the default browser
- `start_budget_app.ps1` — PowerShell version of the same launcher
- `start_budget_app.sh` — Unix/Linux/macOS version of the same launcher
- `_debug_script.js` — reference/debug script with initial budget data and app logic

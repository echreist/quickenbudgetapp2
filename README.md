# Quicken Budget App 2

A static single-page budget dashboard for planning monthly income, expenses, transfers, and debt. The app is implemented in one HTML file with embedded JavaScript and CSS styling.

## Features

- Budget dashboard with income, expenses, and expense transfer tables
- Transfers tab for projected balances using a starting balance
- Debt and balance tracker with repayment and interest calculations
- CSV export and import support
- Browser localStorage persistence for state

## Run locally

Because this is a static HTML app, you can serve it with any local web server:

```sh
py -m http.server 8000
```

Then open:

http://localhost:8000

## Files

- `index.html` — the full application UI and embedded JavaScript
- `_debug_script.js` — reference/debug script with initial budget data and app logic

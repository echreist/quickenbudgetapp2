#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / 'budget_data.json'
BACKUP_DIR = ROOT / 'backups'


def default_template_data():
    return {
        'startingBalance': 5400,
        'income': [
            {'id': 'income-salary', 'name': 'Salary', 'actual': 4300, 'speculation': 4300, 'budget': 4300},
            {'id': 'income-freelance', 'name': 'Freelance', 'actual': 450, 'speculation': 600, 'budget': 500},
            {'id': 'income-interest', 'name': 'Interest', 'actual': 60, 'speculation': 75, 'budget': 80}
        ],
        'expenses': [
            {'id': 'expense-housing', 'name': 'Housing', 'actual': 1750, 'speculation': 1800, 'budget': 1850},
            {'id': 'expense-groceries', 'name': 'Groceries', 'actual': 620, 'speculation': 680, 'budget': 700},
            {'id': 'expense-utilities', 'name': 'Utilities', 'actual': 320, 'speculation': 350, 'budget': 340},
            {'id': 'expense-dining', 'name': 'Dining', 'actual': 280, 'speculation': 320, 'budget': 350},
            {'id': 'expense-auto', 'name': 'Auto', 'actual': 420, 'speculation': 450, 'budget': 430},
            {'id': 'expense-healthcare', 'name': 'Healthcare', 'actual': 260, 'speculation': 300, 'budget': 330},
            {'id': 'expense-loans', 'name': 'Loans', 'actual': 340, 'speculation': 360, 'budget': 350}
        ],
        'expenseTransfers': [
            {'id': 'transfer-hsa', 'name': 'To HSA', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-flex', 'name': 'To Flex Spending', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-will', 'name': "To Will's Checking", 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-jenna', 'name': "To Jenna's Checking", 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-rita', 'name': "To Rita's Checking", 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-amazon', 'name': 'To Amazon', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-bluecash', 'name': 'To Blue Cash Everyday', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-camper', 'name': 'To Camper Loan', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-costco', 'name': 'To Citi Costco', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-escrow', 'name': 'To Escrow', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-home', 'name': 'To Home Loan', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-sofi', 'name': 'To Sofi Personal Loan', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-windows', 'name': 'To Windows LLC', 'actual': 0, 'speculation': 0, 'budget': 0},
            {'id': 'transfer-empower', 'name': 'To Empower Retirement', 'actual': 0, 'speculation': 0, 'budget': 0}
        ],
        'transfers': [
            {'id': 'transfer-emergency-fund', 'name': 'Emergency Fund', 'amount': 350, 'direction': 'outgoing'},
            {'id': 'transfer-401k', 'name': '401(k)', 'amount': 450, 'direction': 'outgoing'},
            {'id': 'transfer-family-support', 'name': 'Family Support', 'amount': 150, 'direction': 'incoming'}
        ],
        'debt': [
            {'id': 'debt-visa', 'creditor': 'Visa', 'balance': 4200, 'rate': 18.9, 'minPayment': 125, 'paymentThisMonth': 180, 'order': 1, 'notes': 'High-interest card'},
            {'id': 'debt-auto', 'creditor': 'Auto Loan', 'balance': 9800, 'rate': 4.7, 'minPayment': 250, 'paymentThisMonth': 260, 'order': 2, 'notes': 'Vehicle payoff'},
            {'id': 'debt-student', 'creditor': 'Student Loan', 'balance': 14200, 'rate': 3.8, 'minPayment': 210, 'paymentThisMonth': 240, 'order': 3, 'notes': 'Federal loan'}
        ]
    }


def read_data_file():
    if DATA_FILE.exists():
        try:
            with DATA_FILE.open('r', encoding='utf-8') as fh:
                parsed = json.load(fh)
            return parsed
        except Exception:
            return default_template_data()
    return default_template_data()


def write_data_file(payload):
    DATA_FILE.write_text(json.dumps(payload, indent=2), encoding='utf-8')


def create_backup_if_needed(payload):
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now().strftime('%Y%m%d')
    # Preserve a daily backup at most once per date.
    existing = list(BACKUP_DIR.glob(f'budget_backup_{today}_*.json'))
    if existing:
        return

    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = BACKUP_DIR / f'budget_backup_{stamp}.json'
    backup_path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    prune_old_backups()


def prune_old_backups(max_backups=30):
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backups = sorted(BACKUP_DIR.glob('budget_backup_*.json'), key=lambda p: p.stat().st_mtime, reverse=True)
    for old_backup in backups[max_backups:]:
        try:
            old_backup.unlink()
        except Exception:
            pass


class BudgetHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=str(ROOT), **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return

        if parsed.path == '/api/load':
            payload = read_data_file()
            self._send_json(200, payload)
            return

        # Default static file behavior for all other GET routes.
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/save':
            try:
                length = int(self.headers.get('Content-Length', '0'))
                raw = self.rfile.read(length) if length > 0 else b''
                payload = json.loads(raw.decode('utf-8')) if raw else {}
                if not isinstance(payload, dict):
                    raise ValueError('Expected a JSON object payload.')

                # Keep the saved file in the workspace root.
                write_data_file(payload)
                create_backup_if_needed(payload)

                self._send_json(200, {'status': 'ok', 'saved': True, 'file': str(DATA_FILE.relative_to(ROOT))})
            except Exception as exc:
                self._send_json(400, {'status': 'error', 'message': str(exc)})
            return

        self._send_json(404, {'status': 'error', 'message': 'Not found'})

    def log_message(self, format, *args):
        # Keep server logs compact.
        sys.stdout.write('%s - - [%s] %s\n' % (self.address_string(), self.log_date_time_string(), format % args))

    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    # Create a startup backup the first time the server comes up for the day.
    payload = read_data_file()
    create_backup_if_needed(payload)

    PORT = int(os.environ.get('PORT', '8000'))
    server = ThreadingHTTPServer(('0.0.0.0', PORT), BudgetHandler)
    print(f'Serving budget app at http://localhost:{PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
    finally:
        server.server_close()

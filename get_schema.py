import urllib.request
import json
import os

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

def get_first_row(table):
    try:
        req = urllib.request.Request(f"{url}/rest/v1/{table}?limit=1", headers={"apikey": key, "Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            if data:
                print(f"--- {table} schema (inferred from data) ---")
                for k, v in data[0].items():
                    print(f"{k}: {type(v).__name__}")
            else:
                print(f"--- {table} is empty ---")
    except Exception as e:
        print(f"Error fetching {table}: {e}")

get_first_row("invoices")
get_first_row("payments")
get_first_row("expenses")

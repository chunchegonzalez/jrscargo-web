import urllib.request
import json
import os

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

req = urllib.request.Request(f"{url}/rest/v1/clients", headers={"apikey": key, "Authorization": f"Bearer {key}"})
with urllib.request.urlopen(req) as response:
    clients = json.loads(response.read())

req = urllib.request.Request(f"{url}/rest/v1/invoices?select=*,clients(id,name,email)", headers={"apikey": key, "Authorization": f"Bearer {key}"})
with urllib.request.urlopen(req) as response:
    invoices = json.loads(response.read())

print("Clients:")
for c in clients[:3]:
    print(c)

print("\nInvoices:")
for i in invoices[:3]:
    print(i)

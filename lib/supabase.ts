const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

export async function getInventory() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/local_inventory?order=created_at.desc`, {
    headers,
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching inventory');
  return res.json();
}

export async function getInventoryItem(id: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/local_inventory?id=eq.${encodeURIComponent(id)}`, {
    headers,
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching item');
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

export async function insertInventoryItem(item: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/local_inventory`, {
    method: 'POST',
    headers,
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error('Error inserting item');
  return res.json();
}

export async function updateInventoryItem(id: string, updates: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/local_inventory?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Error updating item');
  return res.json();
}

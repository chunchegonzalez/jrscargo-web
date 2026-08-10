const getHeaders = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) console.warn('Supabase env vars are missing!');
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
};

export async function getInventory() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/local_inventory?order=created_at.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching inventory');
  return res.json();
}

export async function getInventoryItem(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(id)}`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching item');
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

export async function insertInventoryItem(item: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/local_inventory`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(item)
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Supabase Error:', errText);
    throw new Error('Error inserting item: ' + errText);
  }
  return res.json();
}

export async function updateInventoryItem(id: string, updates: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Error updating item');
  return res.json();
}

export async function deleteInventoryItem(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Error deleting item');
  // DELETE on Supabase usually returns 204 No Content, so we don't try to parse JSON
  return { success: true };
}

export async function getUserByUsername(username: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/users?username=eq.${encodeURIComponent(username)}`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

export async function createUser(user: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(user)
  });
  if (!res.ok) throw new Error('Error creating user');
  return { success: true };
}

export async function deleteUser(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Error deleting user');
  return { success: true };
}

export async function getUsers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/users?order=created_at.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching users');
  return res.json();
}

export async function getDeletionRequests() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/deletion_requests?order=created_at.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching requests');
  return res.json();
}

export async function createDeletionRequest(request: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/deletion_requests`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request)
  });
  if (!res.ok) throw new Error('Error creating request');
  return { success: true };
}

export async function updateDeletionRequest(id: string, updates: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/deletion_requests?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Error updating request');
  return res.json();
}

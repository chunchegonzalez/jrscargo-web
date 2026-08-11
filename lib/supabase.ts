export const getHeaders = () => {
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
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Supabase createUser error:', res.status, errorText);
    throw new Error(`Error creating user: ${res.status} ${errorText}`);
  }
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

export async function updateUser(id: string, updates: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Supabase updateUser error:', res.status, errorText);
    throw new Error(`Error updating user: ${res.status} ${errorText}`);
  }
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

// --- CLIENTES ---

export async function getClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/clients?order=name.asc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching clients');
  return res.json();
}

export async function createClient(client: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/clients`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(client)
  });
  if (!res.ok) throw new Error('Error creating client');
  return { success: true };
}

// --- SERVICIOS ---

export async function getServices() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/services?order=name.asc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching services');
  return res.json();
}

export async function createService(service: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/services`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(service)
  });
  if (!res.ok) throw new Error('Error creating service');
  return { success: true };
}

export async function updateService(id: string, updates: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/services?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Error updating service');
  return { success: true };
}

export async function deleteService(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/services?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Error deleting service');
  return { success: true };
}

// ----------------------------------------------------
// GASTOS (EXPENSES)
// ----------------------------------------------------

export async function getExpenses() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/expenses?order=date.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching expenses');
  return await res.json();
}

export async function createExpense(expense: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/expenses`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(expense)
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error('Supabase Error: ' + errorText);
  }
  return { success: true };
}

export async function deleteExpense(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/expenses?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Error deleting expense');
  return { success: true };
}

// --- FACTURAS ---

export async function getInvoices() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // 1. Fetch invoices with client data
  const res = await fetch(`${url}/rest/v1/invoices?select=*,clients(id,name,email)&order=created_at.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching invoices');
  const invoices = await res.json();

  // 2. Fetch payments gracefully
  try {
    const payRes = await fetch(`${url}/rest/v1/invoice_payments?select=invoice_id,amount_applied`, {
      headers: getHeaders(),
      cache: 'no-store'
    });
    if (payRes.ok) {
      const payments = await payRes.json();
      invoices.forEach((inv: Record<string, unknown>) => {
        inv.invoice_payments = payments.filter((p: Record<string, unknown>) => p.invoice_id === inv.id);
      });
    } else {
      invoices.forEach((inv: Record<string, unknown>) => { inv.invoice_payments = []; });
    }
  } catch {
    invoices.forEach((inv: Record<string, unknown>) => { inv.invoice_payments = []; });
  }

  return invoices;
}

export async function getInvoiceById(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // 1. Fetch invoice + client
  const resInv = await fetch(`${url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}&select=*,clients(*)`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!resInv.ok) throw new Error('Error fetching invoice');
  const invData = await resInv.json();
  if (!invData.length) return null;
  const invoice = invData[0];

  // 2. Fetch items
  const resItems = await fetch(`${url}/rest/v1/invoice_items?invoice_id=eq.${encodeURIComponent(id)}`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!resItems.ok) throw new Error('Error fetching invoice items');
  const items = await resItems.json();

  // 3. Fetch payments
  const resPayments = await fetch(`${url}/rest/v1/invoice_payments?invoice_id=eq.${encodeURIComponent(id)}&select=amount_applied`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  let payments = [];
  if (resPayments.ok) {
    payments = await resPayments.json();
  }

  invoice.items = items;
  invoice.invoice_payments = payments;
  return invoice;
}

export async function createInvoice(invoice: Record<string, unknown>, items: Record<string, unknown>[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // 1. Create Invoice
  const resInv = await fetch(`${url}/rest/v1/invoices`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(invoice)
  });
  if (!resInv.ok) {
    const errorText = await resInv.text();
    console.error('Create Invoice Error:', resInv.status, errorText);
    throw new Error(`DB Error: ${errorText}`);
  }
  const invData = await resInv.json();
  const newInvoiceId = invData[0].id;

  // 2. Create Items
  if (items && items.length > 0) {
    const itemsToInsert = items.map(item => ({ ...item, invoice_id: newInvoiceId }));
    const resItems = await fetch(`${url}/rest/v1/invoice_items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemsToInsert) // PostgREST supports bulk insert with an array
    });
    if (!resItems.ok) {
      console.error('Error creating invoice items');
    }
  }

  return { success: true, id: newInvoiceId };
}

export async function updateInvoice(id: string, updates: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Error updating invoice');
  return { success: true };
}

export async function deleteInvoice(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // Primero eliminamos los items
  await fetch(`${url}/rest/v1/invoice_items?invoice_id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  // Luego eliminamos la factura
  const res = await fetch(`${url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Error deleting invoice');
  return { success: true };
}

export async function updateInvoiceWithItems(id: string, updates: Record<string, unknown>, items: Record<string, unknown>[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // 1. Update Invoice details
  if (Object.keys(updates).length > 0) {
    await updateInvoice(id, updates);
  }

  // 2. Delete old items
  const delRes = await fetch(`${url}/rest/v1/invoice_items?invoice_id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!delRes.ok) {
    console.error('Error deleting old invoice items');
  }

  // 3. Insert new items
  if (items && items.length > 0) {
    const itemsToInsert = items.map(item => ({ ...item, invoice_id: id }));
    const resItems = await fetch(`${url}/rest/v1/invoice_items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemsToInsert)
    });
    if (!resItems.ok) {
      console.error('Error inserting new invoice items');
    }
  }

  return { success: true };
}

export async function updateInvoiceStatus(id: string, status: string) {
  return updateInvoice(id, { status });
}

// ----------------------------------------------------
// PAGOS (PAYMENTS)
// ----------------------------------------------------

export async function createPayment(payment: Record<string, unknown>, appliedInvoices: Record<string, unknown>[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // 1. Create Payment
  const resPayment = await fetch(`${url}/rest/v1/payments`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(payment)
  });
  
  if (!resPayment.ok) {
    const errText = await resPayment.text();
    throw new Error('Error creating payment: ' + errText);
  }
  
  const paymentData = await resPayment.json();
  const newPaymentId = paymentData[0].id;

  // 2. Apply to invoices
  if (appliedInvoices && appliedInvoices.length > 0) {
    const links = appliedInvoices.map(inv => ({
      payment_id: newPaymentId,
      invoice_id: inv.invoice_id,
      amount_applied: inv.amount_applied
    }));
    
    const resLinks = await fetch(`${url}/rest/v1/invoice_payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(links)
    });
    
    if (!resLinks.ok) {
      console.error('Error applying payment to invoices');
    }
  }

  return { success: true, id: newPaymentId };
}

export async function getClientInvoices(clientId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/invoices?client_id=eq.${encodeURIComponent(clientId)}&select=*,invoice_payments(amount_applied)&order=created_at.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error fetching client invoices');
  return res.json();
}

export async function getClientPayments(clientId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const res = await fetch(`${url}/rest/v1/payments?client_id=eq.${encodeURIComponent(clientId)}&select=*,invoice_payments(invoice_id,amount_applied,invoices(invoice_number))&order=payment_date.desc,created_at.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  
  if (!res.ok) {
    // If table doesn't exist or error, gracefully return empty
    return [];
  }
  
  return res.json();
}

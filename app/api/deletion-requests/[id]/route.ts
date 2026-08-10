import { NextResponse } from 'next/server';
import { updateDeletionRequest, deleteInventoryItem } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status, package_id } = await request.json();
    
    // Update the request status
    await updateDeletionRequest(params.id, { status });

    // If approved, actually delete the package from inventory
    if (status === 'approved' && package_id) {
      await deleteInventoryItem(package_id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Error updating request' }, { status: 500 });
  }
}

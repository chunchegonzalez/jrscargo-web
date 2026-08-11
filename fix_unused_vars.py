import os
import re

files_to_fix = [
    'app/admin/bodega/page.tsx',
    'app/admin/facturacion/[id]/editar/page.tsx',
    'app/admin/facturacion/nueva/page.tsx',
    'app/admin/gastos/nuevo/page.tsx',
    'app/admin/inventario/page.tsx'
]

for path in files_to_fix:
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    print(f"Fixing {path}...")
    
    # Check what is actually used
    uses_alert = 'showAlert(' in content
    uses_confirm = 'showConfirm(' in content
    
    # The script added: const { showAlert, showConfirm } = useModal();
    # Let's replace it with exactly what's needed
    if uses_alert and not uses_confirm:
        content = content.replace('const { showAlert, showConfirm } = useModal();', 'const { showAlert } = useModal();')
    elif uses_confirm and not uses_alert:
        content = content.replace('const { showAlert, showConfirm } = useModal();', 'const { showConfirm } = useModal();')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Done fixing unused vars!")

import os
import re

directory = 'app/admin'
files_to_fix = [
    'app/admin/ajustes/page.tsx',
    'app/admin/servicios/page.tsx',
    'app/admin/bodega/page.tsx',
    'app/admin/facturacion/[id]/editar/page.tsx',
    'app/admin/facturacion/[id]/page.tsx',
    'app/admin/facturacion/nueva/page.tsx',
    'app/admin/inventario/page.tsx',
    'app/admin/gastos/page.tsx',
    'app/admin/gastos/nuevo/page.tsx',
    'app/admin/clientes/[id]/page.tsx',
    'app/admin/clientes/page.tsx'
]

for path in files_to_fix:
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'alert(' not in content and 'confirm(' not in content:
        continue
        
    print(f"Fixing {path}...")
    
    # Replace confirm('...') with (await showConfirm('Confirmación', '...'))
    content = re.sub(r"confirm\((['`\"].*?['`\"])\)", r"(await showConfirm('Confirmación', \1))", content)
    
    # Replace alert('...') with await showAlert('Aviso', '...')
    content = re.sub(r"alert\((.*?)\)", r"await showAlert('Aviso', \1)", content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Done!")

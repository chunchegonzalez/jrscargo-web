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
        
    # Check if we need to modify this file
    if 'alert(' not in content and 'confirm(' not in content:
        continue
        
    print(f"Fixing {path}...")
    
    # 1. Add import for useModal if not present
    if 'useModal' not in content:
        # Find the last import statement
        import_match = list(re.finditer(r'^import .*;', content, flags=re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            insert_pos = last_import.end()
            content = content[:insert_pos] + "\nimport { useModal } from '@/app/components/ModalProvider';" + content[insert_pos:]
            
    # 2. Add const { showAlert, showConfirm } = useModal(); inside the main component
    # We find the main component export
    comp_match = re.search(r'export default function (\w+)\s*\([^)]*\)\s*{', content)
    if comp_match:
        insert_pos = comp_match.end()
        content = content[:insert_pos] + "\n  const { showAlert, showConfirm } = useModal();" + content[insert_pos:]

    # 3. Replace confirm('...') with (await showConfirm('Confirmación', '...'))
    # e.g., if (!confirm('...')) return; -> if (!(await showConfirm('Confirmación', '...'))) return;
    # Regex for confirm: confirm\((['`"].*?['`"])\)
    content = re.sub(r"confirm\(([`'\].*?[`'])\)", r"(await showConfirm('Confirmación', \1))", content)
    
    # 4. Replace alert('...') with await showAlert('Aviso', '...')
    # Regex for alert: alert\((['`"].*?['`"])\)
    content = re.sub(r"alert\(([`'\].*?[`'])\)", r"await showAlert('Aviso', \1)", content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Done!")

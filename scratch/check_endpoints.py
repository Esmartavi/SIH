import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

for name in ['loksaba', 'preLoginDashboard']:
    with open(f'scratch/{name}_decoded.js', 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"=== {name} ===")
    endpoints = re.findall(r'["\'](/rest/[^"\']+)["\']', content)
    for ep in set(endpoints):
        print("Endpoint:", ep)
    
    # Also find reversed endpoints
    reversed_eps = re.findall(r'["\'](/rest/[^"\']+)["\']\.split\([^\)]*\)\.reverse\(\)', content)
    for rep in reversed_eps:
        print("Reversed endpoint found:", rep[::-1])
        
    ajax_calls = re.findall(r'\$\.ajax\(\{.*?\}\)', content, re.DOTALL)
    print(f"Found {len(ajax_calls)} ajax calls")
    for call in ajax_calls[:5]:
        # print url or method
        lines = [line.strip() for line in call.split('\n') if 'url' in line.lower() or 'data' in line.lower() or 'method' in line.lower() or 'rest' in line.lower()]
        print("  Ajax snippet:", " | ".join(lines[:4]))

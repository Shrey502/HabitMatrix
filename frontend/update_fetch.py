import os
import re

def update_file(filepath):
    if "api.ts" in filepath or "AuthContext.tsx" in filepath:
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # If fetch is used (but not just the word in comments)
    if 'fetch(' not in content:
        return

    # Replace fetch with apiFetch
    content = re.sub(r'\bfetch\(', 'apiFetch(', content)

    # Add import if missing
    if 'apiFetch' in content and 'from ''@/lib/api''' not in content and 'from "../../lib/api"' not in content:
        # Find the last import
        imports = [m for m in re.finditer(r'^import .*?$', content, re.MULTILINE)]
        if imports:
            last_import = imports[-1]
            idx = last_import.end()
            content = content[:idx] + '\nimport { apiFetch } from "@/lib/api";' + content[idx:]
        else:
            content = 'import { apiFetch } from "@/lib/api";\n' + content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print(f"Updated {filepath}")

search_dirs = [
    r"D:\projects\thinktank\habbit-tracker\habit-tracker\frontend\app",
    r"D:\projects\thinktank\habbit-tracker\habit-tracker\frontend\components"
]

for d in search_dirs:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                update_file(os.path.join(root, file))

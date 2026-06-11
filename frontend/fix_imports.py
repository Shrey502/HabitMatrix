import os
import re

search_dirs = [
    r"D:\projects\thinktank\habbit-tracker\habit-tracker\frontend\app",
    r"D:\projects\thinktank\habbit-tracker\habit-tracker\frontend\components"
]

for d in search_dirs:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Find all imports of apiFetch
                matches = list(re.finditer(r'^import\s*\{\s*apiFetch\s*\}\s*from\s*["\'](?:@|\.\./\.\.)/lib/api["\'];?\s*$', content, re.MULTILINE))
                
                if len(matches) > 1:
                    print(f"Fixing duplicates in {filepath}")
                    # Keep the first match, remove the rest
                    for m in reversed(matches[1:]):
                        content = content[:m.start()] + content[m.end():]
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)

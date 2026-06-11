import os
import re

routers_dir = r'D:\projects\thinktank\habbit-tracker\habit-tracker\backend\routers'

for filename in os.listdir(routers_dir):
    if filename == 'auth.py' or not filename.endswith('.py'):
        continue
        
    filepath = os.path.join(routers_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Imports
    if 'get_current_user' not in content:
        content = 'from auth_utils import get_current_user\nfrom fastapi import Depends\n' + content
        
    # 2. Add user_id to DB queries
    content = re.sub(r'(db\.[a-zA-Z_]+\.find_one\(\{)', r'\1"user_id": user_id, ', content)
    content = re.sub(r'(db\.[a-zA-Z_]+\.find\(\{)', r'\1"user_id": user_id, ', content)
    content = re.sub(r'(db\.[a-zA-Z_]+\.update_one\(\{)', r'\1"user_id": user_id, ', content)
    content = re.sub(r'(db\.[a-zA-Z_]+\.delete_one\(\{)', r'\1"user_id": user_id, ', content)
    content = re.sub(r'(db\.[a-zA-Z_]+\.delete_many\(\{)', r'\1"user_id": user_id, ', content)
    
    # 3. Insert dicts
    content = re.sub(r'(task_dict = task\.model_dump\(\))', r'\1\n    task_dict["user_id"] = user_id', content)
    content = re.sub(r'(journal_dict = journal\.model_dump\(\))', r'\1\n    journal_dict["user_id"] = user_id', content)
    content = re.sub(r'(goal_dict = goal\.model_dump\(\))', r'\1\n    goal_dict["user_id"] = user_id', content)
    content = re.sub(r'(routine_dict = routine\.model_dump\(\))', r'\1\n    routine_dict["user_id"] = user_id', content)
    
    # Special fix for notifications in notifications.py (if the variable is different)
    content = re.sub(r'(notif_dict = notif\.model_dump\(\))', r'\1\n    notif_dict["user_id"] = user_id', content)
    
    # 4. Add Depends to route handler params at the END
    # Only for route handlers (annotated with @router.)
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('async def ') and '(' in line and 'user_id: str =' not in line:
            # We assume any async def inside a router is a route handler
            match = re.search(r'async def ([a-zA-Z0-9_]+)\((.*?)\):', line)
            if match:
                func_name = match.group(1)
                args_str = match.group(2)
                
                # Check if it has a route annotation above it
                if i > 0 and lines[i-1].startswith('@router.'):
                    if args_str.strip() == '':
                        new_args = 'user_id: str = Depends(get_current_user)'
                    else:
                        new_args = args_str + ', user_id: str = Depends(get_current_user)'
                    lines[i] = f'async def {func_name}({new_args}):'
                    
    content = '\n'.join(lines)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

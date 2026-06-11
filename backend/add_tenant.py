import os
import re

files = [
    'backend/routers/tasks.py',
    'backend/routers/journal.py',
    'backend/routers/goals.py',
    'backend/routers/routines.py',
    'backend/routers/analytics.py',
    'backend/routers/notifications.py',
    'backend/routers/calendar.py',
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add user_id to DB queries
    content = re.sub(r'(db\.[a-zA-Z_]+\.find_one\(\{)', r'\1"user_id": user_id, ', content)
    content = re.sub(r'(db\.[a-zA-Z_]+\.find\(\{)', r'\1"user_id": user_id, ', content)
    content = re.sub(r'(db\.[a-zA-Z_]+\.update_one\(\{)', r'\1"user_id": user_id, ', content)
    content = re.sub(r'(db\.[a-zA-Z_]+\.delete_one\(\{)', r'\1"user_id": user_id, ', content)
    content = re.sub(r'(db\.[a-zA-Z_]+\.delete_many\(\{)', r'\1"user_id": user_id, ', content)
    
    # We must also ensure insert queries have user_id. 
    # For tasks: task_dict["user_id"] = user_id
    content = re.sub(r'(task_dict = task.model_dump\(\))', r'\1\n    task_dict["user_id"] = user_id', content)
    content = re.sub(r'(journal_dict = journal.model_dump\(\))', r'\1\n    journal_dict["user_id"] = user_id', content)
    content = re.sub(r'(goal_dict = goal.model_dump\(\))', r'\1\n    goal_dict["user_id"] = user_id', content)
    content = re.sub(r'(routine_dict = routine.model_dump\(\))', r'\1\n    routine_dict["user_id"] = user_id', content)
    content = re.sub(r'(notification_dict = notification.model_dump\(\))', r'\1\n    notification_dict["user_id"] = user_id', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

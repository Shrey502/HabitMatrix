import sys
import os
import random
from datetime import datetime, timedelta, timezone
from database import supabase

def seed_user(email: str):
    print(f"Starting seed process for user email: {email}")
    
    # 1. Fetch user from public.users
    res = supabase.table("users").select("*").eq("email", email.strip().lower()).execute()
    if not res.data:
        print(f"[-] Error: No user found in the database with email '{email}'.")
        print("[!] Please sign up first on the frontend website, then run this script again.")
        return
        
    user = res.data[0]
    user_id = user["user_id"]
    print(f"[+] Found user '{user['name']}' with user_id: {user_id}")
    
    # Update onboarding status
    supabase.table("users").update({
        "onboarding_completed": True,
        "chronotype": "Lion",
        "burnout": "optimal",
        "time_leak": "none"
    }).eq("user_id", user_id).execute()
    print("[+] Updated onboarding status to completed.")

    # 2. Clear existing user data to avoid duplicates
    print("[*] Clearing existing tasks, daily_logs, journals, goals, and routines...")
    supabase.table("tasks").delete().eq("user_id", user_id).execute()
    supabase.table("daily_logs").delete().eq("user_id", user_id).execute()
    supabase.table("journals").delete().eq("user_id", user_id).execute()
    supabase.table("goals").delete().eq("user_id", user_id).execute()
    supabase.table("routines").delete().eq("user_id", user_id).execute()

    # 3. Generate 30 days of historical data
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=30)
    
    task_templates = [
        {"title": "Deep Work: Coding Session", "category": "Development", "duration": 120},
        {"title": "Exercise & Cardio", "category": "Health", "duration": 45},
        {"title": "Review Daily Objectives", "category": "Routine", "duration": 15},
        {"title": "Read Technical Documentation", "category": "Development", "duration": 60},
        {"title": "Meditation & Breathwork", "category": "Mindset", "duration": 20},
        {"title": "Stretching & Yoga", "category": "Health", "duration": 30},
        {"title": "Planning Next Week", "category": "Routine", "duration": 40},
        {"title": "Journal & Log Telemetry", "category": "Routine", "duration": 15},
    ]

    reflections = [
        "Highly focused state today. Completed all development milestones.",
        "A bit fatigued in the afternoon. Need to optimize caffeine timing.",
        "Slept extremely well. Energy levels stayed high throughout the day.",
        "Flow state was easily accessed. Binaural beats at 40Hz helped focus.",
        "Felt distracted. Need to limit screen time in the morning.",
        "Solid physical recovery. Workout was high intensity.",
        "Overall productive day. Collision engine helped resolve task overlaps."
    ]

    print("[*] Seeding tasks, daily_logs, and journals...")
    for i in range(31):
        current_date = start_date + timedelta(days=i)
        date_str = str(current_date)
        
        # Decide how many tasks for this day (2 to 5)
        num_tasks = random.randint(3, 5)
        day_tasks = random.sample(task_templates, num_tasks)
        
        done_count = 0
        
        for idx, temp in enumerate(day_tasks):
            # Today's tasks might be To-Do, historical tasks should be Done
            status = "Done"
            if current_date == today:
                status = "Done" if idx < 2 else "To-Do"
                
            task_data = {
                "user_id": user_id,
                "title": temp["title"],
                "category": temp["category"],
                "status": status,
                "date": date_str,
                "time": f"{8 + idx * 2:02d}:00",
                "duration": temp["duration"],
                "reminder_minutes": 15
            }
            supabase.table("tasks").insert(task_data).execute()
            if status == "Done":
                done_count += 1
                
        # Insert Daily Log for contribution grid
        if done_count > 0:
            supabase.table("daily_logs").insert({
                "user_id": user_id,
                "date": date_str,
                "total_completed": done_count
            }).execute()
            
        # Insert Daily Journal Entry
        mood = random.randint(6, 10)
        energy = random.randint(6, 10)
        
        # Correlate mood/energy with task completion slightly
        if done_count >= 4:
            mood = min(mood + 1, 10)
            energy = min(energy + 1, 10)
        elif done_count <= 2:
            mood = max(mood - 2, 4)
            energy = max(energy - 2, 4)
            
        tags = ["#Productive"]
        if mood >= 8 and energy >= 8:
            tags.append("#FlowState")
        elif mood <= 5:
            tags.append("#Fatigue")
            
        journal_data = {
            "user_id": user_id,
            "date": date_str,
            "mood_score": mood,
            "energy_score": energy,
            "reflection": random.choice(reflections),
            "tags": tags
        }
        supabase.table("journals").insert(journal_data).execute()

    print("[+] Tasks, daily_logs, and journals seeded.")

    # 4. Seed Goals (Mind Map nodes)
    print("[*] Seeding mind map goals...")
    goals = [
        {"id": "g1", "title": "Master Full-Stack Dev", "description": "Obtain operational mastery of Next.js and FastAPI", "status": "In Progress", "parent_id": None, "color": "#3b82f6", "x": 300, "y": 100, "connections": ["g2", "g3"]},
        {"id": "g2", "title": "Complete HabitMatrix OS", "description": "Finish timeboxing and telemetry integrations", "status": "In Progress", "parent_id": "g1", "color": "#10b981", "x": 150, "y": 250, "connections": ["g4"]},
        {"id": "g3", "title": "Learn System Design", "description": "Understand distributed architectures", "status": "To-Do", "parent_id": "g1", "color": "#f59e0b", "x": 450, "y": 250, "connections": []},
        {"id": "g4", "title": "Deploy Telemetry Engine", "description": "Connect MongoDB and FastAPI analytics", "status": "Done", "parent_id": "g2", "color": "#84cc16", "x": 150, "y": 400, "connections": []}
    ]
    
    for g in goals:
        g_data = {
            "user_id": user_id,
            "title": g["title"],
            "description": g["description"],
            "status": g["status"],
            "parent_id": g["parent_id"],
            "color": g["color"],
            "x": g["x"],
            "y": g["y"],
            "connections": g["connections"]
        }
        supabase.table("goals").insert(g_data).execute()
        
    print("[+] Mind map goals seeded.")

    # 5. Seed Routines (The Armory)
    print("[*] Seeding Routines (The Armory)...")
    routines = [
        {
            "title": "Morning Routine",
            "description": " Calibrate focus, hydrate, and outline deep work",
            "tasks": [
                {"title": "Drink Water & Hydrate", "duration": 5, "category": "Health"},
                {"title": "10-Min Mindfulness Meditation", "duration": 10, "category": "Mindset"},
                {"title": "Review Daily Dashboard", "duration": 10, "category": "Routine"},
                {"title": "Deep Coding Focus Session", "duration": 120, "category": "Development"}
            ]
        },
        {
            "title": "Evening Wind-Down",
            "description": "Analyze biometric telemetry and shut down task engine",
            "tasks": [
                {"title": "Write Captain's Log Reflection", "duration": 15, "category": "Routine"},
                {"title": "Review Analytics & Glowing Dot Matrix", "duration": 10, "category": "Routine"},
                {"title": "Stretching & Relaxation", "duration": 20, "category": "Health"}
            ]
        }
    ]

    for r in routines:
        r_data = {
            "user_id": user_id,
            "title": r["title"],
            "description": r["description"],
            "tasks": r["tasks"]
        }
        supabase.table("routines").insert(r_data).execute()

    print("[+] Routines seeded successfully.")
    print(f"\n[***] SUCCESS: User '{email}' has been successfully seeded with 30 days of rich telemetry data! [***]")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python seed_user.py <user_email>")
        sys.exit(1)
        
    email_arg = sys.argv[1]
    seed_user(email_arg)

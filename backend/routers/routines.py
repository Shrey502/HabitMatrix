from auth_utils import get_current_user
from fastapi import Depends, APIRouter, HTTPException
from models import RoutineBase, RoutineDB
from database import supabase
from typing import Optional
from datetime import datetime, timezone, timedelta

router = APIRouter()

@router.get("/routines", response_model=list[RoutineDB])
async def get_routines(user_id: str = Depends(get_current_user)):
    res = supabase.table("routines").select("*").eq("user_id", user_id).execute()
    return res.data or []

@router.post("/routines", response_model=RoutineDB)
async def create_routine(routine: RoutineBase, user_id: str = Depends(get_current_user)):
    routine_dict = routine.model_dump()
    routine_dict["user_id"] = user_id
    res = supabase.table("routines").insert(routine_dict).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create routine")
    return res.data[0]

@router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str, user_id: str = Depends(get_current_user)):
    supabase.table("routines").delete().eq("id", routine_id).eq("user_id", user_id).execute()
    return {"message": "Routine deleted"}

@router.put("/routines/{routine_id}", response_model=RoutineDB)
async def update_routine(
    routine_id: str,
    routine: RoutineBase,
    update_today: bool = False,
    date: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    update_data = routine.model_dump(exclude_unset=True)
    supabase.table("routines").update(update_data).eq("id", routine_id).eq("user_id", user_id).execute()
    res = supabase.table("routines").select("*").eq("id", routine_id).eq("user_id", user_id).single().execute()

    if update_today and date:
        # Delete uncompleted tasks deployed by this routine today
        supabase.table("tasks").delete().eq("user_id", user_id).eq("routine_id", routine_id).eq("date", date).neq("status", "Done").execute()

        # Deploy updated tasks
        tasks_to_insert = []
        for task_template in routine.tasks:
            tasks_to_insert.append({
                "user_id": user_id,
                "title": task_template.get("title"),
                "category": task_template.get("category"),
                "status": "To-Do",
                "date": date,
                "duration": task_template.get("duration"),
                "time": task_template.get("time"),
                "routine_id": routine_id,
            })
        if tasks_to_insert:
            supabase.table("tasks").insert(tasks_to_insert).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Routine not found")
    return res.data

@router.post("/routines/{routine_id}/deploy")
async def deploy_routine(routine_id: str, date: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("routines").select("*").eq("id", routine_id).eq("user_id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Routine not found")
    routine = res.data

    tasks_to_insert = []
    for task_template in routine.get("tasks", []):
        tasks_to_insert.append({
            "user_id": user_id,
            "title": task_template["title"],
            "category": task_template["category"],
            "status": "To-Do",
            "date": date,
            "duration": task_template.get("duration"),
            "time": task_template.get("time"),
            "reminder_minutes": task_template.get("reminder_minutes"),
            "routine_id": routine_id,
        })

    if tasks_to_insert:
        supabase.table("tasks").insert(tasks_to_insert).execute()

    return {"message": f"Deployed {len(tasks_to_insert)} tasks to {date}"}

@router.post("/routines/deploy-week")
async def deploy_week_routines(user_id: str = Depends(get_current_user)):
    user_res = supabase.table("users").select("settings").eq("user_id", user_id).execute()
    settings = user_res.data[0].get("settings", {}) if user_res.data else {}
    weekoffs = settings.get("weekoffs", [5, 6])
    
    start_of_week = (max(weekoffs) + 1) % 7 if weekoffs else 0

    today_dt = datetime.now(timezone.utc)
    days_since_start = (today_dt.weekday() - start_of_week) % 7
    current_week_start_dt = today_dt - timedelta(days=days_since_start)
    current_week_start_date = current_week_start_dt.strftime("%Y-%m-%d")

    # Only deploy once per cycle
    if settings.get("last_weekly_plan_date") == current_week_start_date:
        return {"message": "Already planned for this week", "deployed_count": 0, "week_start": current_week_start_date}

    res = supabase.table("routines").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    all_active_routines = res.data or []

    # Get existing routine tasks for this 7 day period to avoid duplicates
    end_dt = current_week_start_dt + timedelta(days=6)
    end_date = end_dt.strftime("%Y-%m-%d")
    existing_tasks_res = supabase.table("tasks").select("routine_id, date").eq("user_id", user_id).gte("date", current_week_start_date).lte("date", end_date).not_.is_("routine_id", "null").execute()
    
    existing_set = set()
    for t in (existing_tasks_res.data or []):
        existing_set.add(f"{t['routine_id']}_{t['date']}")

    tasks_to_insert = []
    
    for i in range(7):
        target_dt = current_week_start_dt + timedelta(days=i)
        target_date = target_dt.strftime("%Y-%m-%d")
        target_day = target_dt.weekday()
        
        is_weekoff = target_day in weekoffs
        routines_for_day = [r for r in all_active_routines if r.get("days") is not None and target_day in r.get("days")]
        
        for routine in routines_for_day:
            if f"{routine['id']}_{target_date}" in existing_set:
                continue
                
            for task_template in routine.get("tasks", []):
                cat = task_template.get("category", "")
                if is_weekoff and cat.upper() in ["WORK", "OFFICE"]:
                    continue
                    
                tasks_to_insert.append({
                    "user_id": user_id,
                    "title": task_template.get("title"),
                    "category": cat,
                    "status": "To-Do",
                    "date": target_date,
                    "duration": task_template.get("duration"),
                    "time": task_template.get("time"),
                    "reminder_minutes": task_template.get("reminder_minutes"),
                    "routine_id": routine["id"],
                })

    if tasks_to_insert:
        supabase.table("tasks").insert(tasks_to_insert).execute()
        
    settings["last_weekly_plan_date"] = current_week_start_date
    supabase.table("users").update({"settings": settings}).eq("user_id", user_id).execute()

    return {"message": f"Auto-deployed {len(tasks_to_insert)} tasks for the week", "deployed_count": len(tasks_to_insert), "week_start": current_week_start_date}

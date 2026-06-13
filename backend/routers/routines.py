from auth_utils import get_current_user
from fastapi import Depends, APIRouter, HTTPException
from models import RoutineBase, RoutineDB
from database import supabase
from typing import Optional
from datetime import datetime, timezone

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

from auth_utils import get_current_user
from fastapi import Depends, APIRouter, HTTPException
from typing import List
from datetime import datetime, timezone
from database import supabase
from models import TaskBase, TaskDB, TaskUpdateStatus, TaskUpdate, Category
from services import classify_task_category

router = APIRouter()

@router.post("/tasks", response_model=TaskDB)
async def create_task(task: TaskBase, user_id: str = Depends(get_current_user)):
    task_dict = task.model_dump()
    task_dict["user_id"] = user_id
    if task_dict.get("category") == Category.AUTO:
        task_dict["category"] = classify_task_category(task_dict["title"])
    task_dict.pop("category", None)  # re-insert as string value
    task_dict["category"] = task_dict.get("category") or classify_task_category(task.title)

    # Rebuild cleanly
    insert_data = {
        "user_id": user_id,
        "title": task.title,
        "category": classify_task_category(task.title) if task.category == Category.AUTO else task.category.value,
        "status": task.status.value,
        "date": task.date,
        "time": task.time,
        "duration": task.duration,
        "reminder_minutes": task.reminder_minutes,
        "routine_id": task.routine_id,
    }
    res = supabase.table("tasks").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create task")
    return res.data[0]

@router.get("/tasks/weekly", response_model=List[TaskDB])
async def get_weekly_tasks(start_date: str, end_date: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").select("*").eq("user_id", user_id).gte("date", start_date).lte("date", end_date).execute()
    return res.data or []

@router.patch("/tasks/{id}/status")
async def update_task_status(id: str, update: TaskUpdateStatus, user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").update({"status": update.status.value}).eq("id", id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    if update.status.value == "Done":
        task = res.data[0]
        # Upsert daily log
        existing = supabase.table("daily_logs").select("*").eq("user_id", user_id).eq("date", task["date"]).execute()
        if existing.data:
            current = existing.data[0]["total_completed"] or 0
            supabase.table("daily_logs").update({"total_completed": current + 1}).eq("user_id", user_id).eq("date", task["date"]).execute()
        else:
            supabase.table("daily_logs").insert({"user_id": user_id, "date": task["date"], "total_completed": 1}).execute()
    return {"message": "Status updated"}

@router.get("/tasks/today")
async def get_today_tasks(user_id: str = Depends(get_current_user)):
    today = str(datetime.now(timezone.utc).date())
    res = supabase.table("tasks").select("*").eq("user_id", user_id).eq("date", today).execute()
    tasks = res.data or []
    for t in tasks:
        t["_id"] = t.get("id")
    total = len(tasks)
    done = sum(1 for t in tasks if t["status"] == "Done")
    rate = round((done / total) * 100, 1) if total else 0.0
    return {"tasks": tasks, "total": total, "done": done, "rate": rate, "date": today}

@router.get("/tasks/weekly-summary")
async def get_weekly_summary(start_date: str, end_date: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").select("date,status").eq("user_id", user_id).gte("date", start_date).lte("date", end_date).execute()
    tasks = res.data or []
    summary: dict[str, dict] = {}
    for t in tasks:
        d = t["date"]
        if d not in summary:
            summary[d] = {"total": 0, "done": 0}
        summary[d]["total"] += 1
        if t["status"] == "Done":
            summary[d]["done"] += 1
    for d in summary:
        s = summary[d]
        s["rate"] = round((s["done"] / s["total"]) * 100, 1) if s["total"] else 0.0
    return summary

@router.get("/tasks/date/{date}", response_model=List[TaskDB])
async def get_tasks_by_date(date: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").select("*").eq("user_id", user_id).eq("date", date).execute()
    return res.data or []

@router.delete("/tasks/{id}")
async def delete_task(id: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").delete().eq("id", id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Deleted successfully"}

@router.put("/tasks/{id}", response_model=TaskDB)
async def update_task(id: str, update: TaskUpdate, user_id: str = Depends(get_current_user)):
    update_data = update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    if update_data.get("category") == Category.AUTO:
        if update_data.get("title"):
            update_data["category"] = classify_task_category(update_data["title"])
        else:
            existing = supabase.table("tasks").select("title").eq("id", id).eq("user_id", user_id).single().execute()
            if existing.data:
                update_data["category"] = classify_task_category(existing.data.get("title", ""))

    # Convert enum to value if present
    if "category" in update_data and hasattr(update_data["category"], "value"):
        update_data["category"] = update_data["category"].value
    if "status" in update_data and hasattr(update_data["status"], "value"):
        update_data["status"] = update_data["status"].value

    res = supabase.table("tasks").update(update_data).eq("id", id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return res.data[0]

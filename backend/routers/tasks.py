from auth_utils import get_current_user
from fastapi import Depends
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from models import TaskBase, TaskDB, TaskUpdateStatus, TaskUpdate, Category
from services import classify_task_category

router = APIRouter()

@router.post("/tasks", response_model=TaskDB)
async def create_task(task: TaskBase, user_id: str = Depends(get_current_user)):
    task_dict = task.model_dump()
    task_dict["user_id"] = user_id
    if task_dict.get("category") == Category.AUTO:
        task_dict["category"] = classify_task_category(task_dict["title"])
    task_dict["created_at"] = datetime.now(timezone.utc)
    new_task = await db.tasks.insert_one(task_dict)
    created_task = await db.tasks.find_one({"user_id": user_id, "_id": new_task.inserted_id})
    return created_task

@router.get("/tasks/weekly", response_model=List[TaskDB])
async def get_weekly_tasks(start_date: str, end_date: str, user_id: str = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user_id, "date": {"$gte": start_date, "$lte": end_date}}).to_list(200)
    return tasks

@router.patch("/tasks/{id}/status")
async def update_task_status(id: str, update: TaskUpdateStatus, user_id: str = Depends(get_current_user)):
    result = await db.tasks.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": update.status.value}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    if update.status.value == "Done":
        task = await db.tasks.find_one({"user_id": user_id, "_id": ObjectId(id)})
        if task:
            await db.daily_logs.update_one(
                {"date": task["date"]},
                {"$inc": {"total_completed": 1}},
                upsert=True
            )
    return {"message": "Status updated"}

@router.get("/tasks/today")
async def get_today_tasks(user_id: str = Depends(get_current_user)):
    today = str(datetime.now(timezone.utc).date())
    tasks = await db.tasks.find({"user_id": user_id, "date": today}).to_list(100)
    for t in tasks:
        t["_id"] = str(t["_id"])
    total = len(tasks)
    done  = sum(1 for t in tasks if t["status"] == "Done")
    rate  = round((done / total) * 100, 1) if total else 0.0
    return {"tasks": tasks, "total": total, "done": done, "rate": rate, "date": today}

@router.get("/tasks/weekly-summary")
async def get_weekly_summary(start_date: str, end_date: str, user_id: str = Depends(get_current_user)):
    """Returns per-day completion stats for the week."""
    tasks = await db.tasks.find({"user_id": user_id, "date": {"$gte": start_date, "$lte": end_date}}).to_list(200)
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
    tasks = await db.tasks.find({"user_id": user_id, "date": date}).to_list(100)
    return tasks

@router.delete("/tasks/{id}")
async def delete_task(id: str, user_id: str = Depends(get_current_user)):
    result = await db.tasks.delete_one({"user_id": user_id, "_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Deleted successfully"}

@router.put("/tasks/{id}", response_model=TaskDB)
async def update_task(id: str, update: TaskUpdate, user_id: str = Depends(get_current_user)):
    update_data = update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    
    if update_data.get("category") == Category.AUTO and update_data.get("title"):
        update_data["category"] = classify_task_category(update_data["title"])
    elif update_data.get("category") == Category.AUTO:
        # If no title provided during update but category set to Auto, we must fetch the existing title
        existing = await db.tasks.find_one({"user_id": user_id, "_id": ObjectId(id)})
        if existing:
            update_data["category"] = classify_task_category(existing.get("title", ""))

    result = await db.tasks.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await db.tasks.find_one({"user_id": user_id, "_id": ObjectId(id)})
    return updated_task

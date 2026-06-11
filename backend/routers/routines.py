from auth_utils import get_current_user
from fastapi import Depends
from fastapi import APIRouter, HTTPException
from models import RoutineBase, RoutineDB
from database import db
from bson import ObjectId

router = APIRouter()

@router.get("/routines", response_model=list[RoutineDB])
async def get_routines(user_id: str = Depends(get_current_user)):
    routines = await db.routines.find().to_list(100)
    return routines

@router.post("/routines", response_model=RoutineDB)
async def create_routine(routine: RoutineBase, user_id: str = Depends(get_current_user)):
    routine_dict = routine.model_dump()
    routine_dict["user_id"] = user_id
    result = await db.routines.insert_one(routine_dict)
    created = await db.routines.find_one({"user_id": user_id, "_id": result.inserted_id})
    return created

@router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str, user_id: str = Depends(get_current_user)):
    await db.routines.delete_one({"user_id": user_id, "_id": ObjectId(routine_id)})
    return {"message": "Routine deleted"}

from typing import Optional

@router.put("/routines/{routine_id}", response_model=RoutineDB)
async def update_routine(routine_id: str, routine: RoutineBase, update_today: bool = False, date: Optional[str] = None, user_id: str = Depends(get_current_user)):
    update_data = routine.model_dump(exclude_unset=True)
    await db.routines.update_one({"user_id": user_id, "_id": ObjectId(routine_id)}, {"$set": update_data})
    updated = await db.routines.find_one({"user_id": user_id, "_id": ObjectId(routine_id)})
    
    if update_today and date:
        # Delete uncompleted tasks deployed by this routine today
        await db.tasks.delete_many({"user_id": user_id, 
            "routine_id": routine_id,
            "date": date,
            "status": {"$ne": "Done"}
        })
        
        # Deploy updated tasks
        tasks_to_insert = []
        for task_template in routine.tasks:
            new_task = {
                "title": task_template.get("title"),
                "category": task_template.get("category"),
                "status": "To-Do",
                "date": date,
                "duration": task_template.get("duration"),
                "time": task_template.get("time"),
                "routine_id": routine_id
            }
            tasks_to_insert.append(new_task)
        if tasks_to_insert:
            await db.tasks.insert_many(tasks_to_insert)
            
    return updated

@router.post("/routines/{routine_id}/deploy")
async def deploy_routine(routine_id: str, date: str, user_id: str = Depends(get_current_user)):
    routine = await db.routines.find_one({"user_id": user_id, "_id": ObjectId(routine_id)})
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    tasks_to_insert = []
    for task_template in routine["tasks"]:
        new_task = {
            "title": task_template["title"],
            "category": task_template["category"],
            "status": "To-Do",
            "date": date,
            "duration": task_template.get("duration"),
            "time": task_template.get("time"),
            "reminder_minutes": task_template.get("reminder_minutes"),
            "routine_id": str(routine_id)
        }
        tasks_to_insert.append(new_task)
        
    if tasks_to_insert:
        await db.tasks.insert_many(tasks_to_insert)
        
    return {"message": f"Deployed {len(tasks_to_insert)} tasks to {date}"}

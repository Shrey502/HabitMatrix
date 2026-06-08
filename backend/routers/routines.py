from fastapi import APIRouter, HTTPException
from models import RoutineBase, RoutineDB
from database import db
from bson import ObjectId

router = APIRouter()

@router.get("/routines", response_model=list[RoutineDB])
async def get_routines():
    routines = await db.routines.find().to_list(100)
    return routines

@router.post("/routines", response_model=RoutineDB)
async def create_routine(routine: RoutineBase):
    routine_dict = routine.model_dump()
    result = await db.routines.insert_one(routine_dict)
    created = await db.routines.find_one({"_id": result.inserted_id})
    return created

@router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str):
    await db.routines.delete_one({"_id": ObjectId(routine_id)})
    return {"message": "Routine deleted"}

@router.post("/routines/{routine_id}/deploy")
async def deploy_routine(routine_id: str, date: str):
    routine = await db.routines.find_one({"_id": ObjectId(routine_id)})
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
            "reminder_minutes": task_template.get("reminder_minutes")
        }
        tasks_to_insert.append(new_task)
        
    if tasks_to_insert:
        await db.tasks.insert_many(tasks_to_insert)
        
    return {"message": f"Deployed {len(tasks_to_insert)} tasks to {date}"}

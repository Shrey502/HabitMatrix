from auth_utils import get_current_user
from fastapi import Depends
from fastapi import APIRouter, HTTPException
from models import GoalNodeBase, GoalNodeDB, GoalNodeUpdate
from database import db
from bson import ObjectId

router = APIRouter()

@router.get("/goals", response_model=list[GoalNodeDB])
async def get_goals(user_id: str = Depends(get_current_user)):
    goals = await db.goals.find().to_list(1000)
    return goals

@router.post("/goals", response_model=GoalNodeDB)
async def create_goal(goal: GoalNodeBase, user_id: str = Depends(get_current_user)):
    goal_dict = goal.model_dump()
    goal_dict["user_id"] = user_id
    result = await db.goals.insert_one(goal_dict)
    created_goal = await db.goals.find_one({"user_id": user_id, "_id": result.inserted_id})
    return created_goal

@router.put("/goals/{goal_id}", response_model=GoalNodeDB)
async def update_goal(goal_id: str, goal_update: GoalNodeUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in goal_update.model_dump().items() if v is not None}
    if update_data:
        await db.goals.update_one({"user_id": user_id, "_id": ObjectId(goal_id)}, {"$set": update_data})
    updated = await db.goals.find_one({"user_id": user_id, "_id": ObjectId(goal_id)})
    if updated: return updated
    raise HTTPException(status_code=404, detail="Goal not found")

@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    await db.goals.delete_one({"user_id": user_id, "_id": ObjectId(goal_id)})
    # Also delete children (simple cascade)
    await db.goals.delete_many({"user_id": user_id, "parent_id": goal_id})
    return {"message": "Goal deleted"}

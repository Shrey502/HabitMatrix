from auth_utils import get_current_user
from fastapi import Depends, APIRouter, HTTPException
from models import GoalNodeBase, GoalNodeDB, GoalNodeUpdate
from database import supabase
import json

router = APIRouter()

@router.get("/goals", response_model=list[GoalNodeDB])
async def get_goals(user_id: str = Depends(get_current_user)):
    res = supabase.table("goals").select("*").eq("user_id", user_id).execute()
    return res.data or []

@router.post("/goals", response_model=GoalNodeDB)
async def create_goal(goal: GoalNodeBase, user_id: str = Depends(get_current_user)):
    insert_data = goal.model_dump()
    insert_data["user_id"] = user_id
    # connections is a list — stored as JSONB
    res = supabase.table("goals").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create goal")
    return res.data[0]

@router.put("/goals/{goal_id}", response_model=GoalNodeDB)
async def update_goal(goal_id: str, goal_update: GoalNodeUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in goal_update.model_dump().items() if v is not None}
    if update_data:
        supabase.table("goals").update(update_data).eq("id", goal_id).eq("user_id", user_id).execute()
    res = supabase.table("goals").select("*").eq("id", goal_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    return res.data[0]

@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    supabase.table("goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()
    # Cascade delete children
    supabase.table("goals").delete().eq("parent_id", goal_id).eq("user_id", user_id).execute()
    return {"message": "Goal deleted"}

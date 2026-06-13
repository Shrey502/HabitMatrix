from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase
from datetime import datetime, timezone
from auth_utils import get_current_user
from models import UserSettings

router = APIRouter()

class OnboardingData(BaseModel):
    chronotype: str
    burnout: str
    leak: str

@router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    res = supabase.table("users").select("*").eq("user_id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = res.data
    return {
        "name": user["name"],
        "email": user.get("email", ""),
        "onboarding_completed": user.get("onboarding_completed", False),
        "chronotype": user.get("chronotype"),
        "settings": user.get("settings", {}),
    }

@router.post("/auth/onboarding")
async def complete_onboarding(data: OnboardingData, user_id: str = Depends(get_current_user)):
    res = supabase.table("users").update({
        "onboarding_completed": True,
        "chronotype": data.chronotype,
        "burnout": data.burnout,
        "time_leak": data.leak,
    }).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Onboarding completed successfully"}

@router.get("/auth/settings")
async def get_settings(user_id: str = Depends(get_current_user)):
    res = supabase.table("users").select("settings").eq("user_id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data.get("settings") or UserSettings().model_dump()

@router.put("/auth/settings")
async def update_settings(settings: UserSettings, user_id: str = Depends(get_current_user)):
    res = supabase.table("users").update({
        "settings": settings.model_dump()
    }).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Settings updated"}

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db
from datetime import datetime, timezone
import uuid

router = APIRouter()

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class OnboardingData(BaseModel):
    user_id: str
    chronotype: str
    burnout: str
    leak: str

@router.post("/auth/register")
async def register(user: UserRegister):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # In a real app, hash password using bcrypt
    new_user = {
        "user_id": str(uuid.uuid4()),
        "name": user.name,
        "email": user.email,
        "password": user.password, # Plain text for demo prototype
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(new_user)
    return {"token": new_user["user_id"], "name": new_user["name"], "onboarding_completed": False}

@router.post("/auth/login")
async def login(user: UserLogin):
    existing = await db.users.find_one({"email": user.email})
    if not existing or existing["password"] != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "token": existing["user_id"], 
        "name": existing["name"], 
        "onboarding_completed": existing.get("onboarding_completed", False)
    }

@router.post("/auth/onboarding")
async def complete_onboarding(data: OnboardingData):
    result = await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {
            "onboarding_completed": True,
            "chronotype": data.chronotype,
            "burnout": data.burnout,
            "time_leak": data.leak
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Onboarding completed successfully"}

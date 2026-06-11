from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import db
from datetime import datetime, timezone
import uuid
from auth_utils import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user
from models import UserSettings

router = APIRouter()

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class OnboardingData(BaseModel):
    chronotype: str
    burnout: str
    leak: str

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/auth/register")
async def register(user: UserRegister):
    user.email = user.email.lower()
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid.uuid4())
    new_user = {
        "user_id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(new_user)
    
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "name": new_user["name"], 
        "onboarding_completed": False
    }

@router.post("/auth/login")
async def login(user: UserLogin):
    user.email = user.email.lower()
    existing = await db.users.find_one({"email": user.email})
    if not existing or not verify_password(user.password, existing["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = existing["user_id"]
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "name": existing["name"], 
        "onboarding_completed": existing.get("onboarding_completed", False)
    }

@router.post("/auth/refresh")
async def refresh(req: RefreshRequest):
    from auth_utils import decode_token
    payload = decode_token(req.refresh_token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = payload["sub"]
    access_token = create_access_token({"sub": user_id})
    return {"access_token": access_token}

@router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "name": user["name"],
        "email": user["email"],
        "onboarding_completed": user.get("onboarding_completed", False),
        "chronotype": user.get("chronotype"),
        "settings": user.get("settings", {})
    }

@router.post("/auth/onboarding")
async def complete_onboarding(data: OnboardingData, user_id: str = Depends(get_current_user)):
    result = await db.users.update_one(
        {"user_id": user_id},
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

@router.get("/auth/settings")
async def get_settings(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.get("settings", UserSettings().model_dump())

@router.put("/auth/settings")
async def update_settings(settings: UserSettings, user_id: str = Depends(get_current_user)):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"settings": settings.model_dump()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Settings updated"}

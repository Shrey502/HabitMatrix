from auth_utils import get_current_user
from fastapi import Depends, APIRouter
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from database import supabase

router = APIRouter()

class NotificationCreate(BaseModel):
    task_id: str
    title: str
    remind_at: str  # ISO datetime string "2026-06-10T09:00:00"

@router.post("/notifications/schedule")
async def schedule_notification(notif: NotificationCreate, user_id: str = Depends(get_current_user)):
    doc = notif.model_dump()
    doc["user_id"] = user_id
    doc["fired"] = False
    res = supabase.table("notifications").insert(doc).execute()
    return {"id": res.data[0]["id"] if res.data else None, "message": "Notification scheduled"}

@router.get("/notifications/pending")
async def get_pending_notifications(user_id: str = Depends(get_current_user)):
    window_end = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat()
    res = supabase.table("notifications").select("*").eq("user_id", user_id).eq("fired", False).lte("remind_at", window_end).execute()
    notifs = res.data or []
    if notifs:
        ids = [n["id"] for n in notifs]
        for nid in ids:
            supabase.table("notifications").update({"fired": True}).eq("id", nid).execute()
    return [{"id": n["id"], "title": n["title"], "remind_at": n["remind_at"]} for n in notifs]

@router.get("/notifications/upcoming")
async def get_upcoming_notifications(user_id: str = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    res = supabase.table("notifications").select("*").eq("user_id", user_id).eq("fired", False).gte("remind_at", now).order("remind_at").limit(20).execute()
    notifs = res.data or []
    return [{"id": n["id"], "title": n["title"], "task_id": n["task_id"], "remind_at": n["remind_at"]} for n in notifs]

@router.delete("/notifications/{id}")
async def delete_notification(id: str, user_id: str = Depends(get_current_user)):
    supabase.table("notifications").delete().eq("id", id).eq("user_id", user_id).execute()
    return {"message": "Deleted"}

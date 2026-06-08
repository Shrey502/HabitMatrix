from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from database import db

router = APIRouter()

class NotificationCreate(BaseModel):
    task_id:  str
    title:    str
    remind_at: str   # ISO datetime string "2026-06-10T09:00:00"

@router.post("/notifications/schedule")
async def schedule_notification(notif: NotificationCreate):
    doc = notif.model_dump()
    doc["fired"]      = False
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.notifications.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Notification scheduled"}

@router.get("/notifications/pending")
async def get_pending_notifications():
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    # Return notifications due in the next 60 seconds that haven't fired
    window_end = (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat().replace("+00:00", "Z")
    notifs = await db.notifications.find({
        "fired": False,
        "remind_at": {"$lte": window_end}
    }).to_list(50)
    ids = [n["_id"] for n in notifs]
    if ids:
        await db.notifications.update_many({"_id": {"$in": ids}}, {"$set": {"fired": True}})
    return [{"id": str(n["_id"]), "title": n["title"], "remind_at": n["remind_at"]} for n in notifs]

@router.get("/notifications/upcoming")
async def get_upcoming_notifications():
    """All unfired future notifications for the bell display."""
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    notifs = await db.notifications.find({
        "fired": False,
        "remind_at": {"$gte": now}
    }).sort("remind_at", 1).to_list(20)
    return [{"id": str(n["_id"]), "title": n["title"],
             "task_id": n["task_id"], "remind_at": n["remind_at"]} for n in notifs]

@router.delete("/notifications/{id}")
async def delete_notification(id: str):
    await db.notifications.delete_one({"_id": ObjectId(id)})
    return {"message": "Deleted"}

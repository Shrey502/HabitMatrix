from auth_utils import get_current_user
from fastapi import Depends
import os
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from database import db
from services import classify_task_category
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:3000")

router = APIRouter()

class CalendarEvent(BaseModel):
    google_event_id: str
    title:           str
    date:            str          # YYYY-MM-DD
    time:            Optional[str] = None
    duration:        Optional[int] = None
    category:        Optional[str] = "Routine"

class CalendarSyncPayload(BaseModel):
    events: List[CalendarEvent]

# Helper to parse Google Calendar event time and calculate duration
def parse_google_time_and_duration(e: dict):
    start = e.get("start", {})
    end = e.get("end", {})
    
    start_dateTime = start.get("dateTime")
    end_dateTime = end.get("dateTime")
    
    if not start_dateTime or not end_dateTime:
        # All day event
        return None, None
        
    try:
        # Handle 'Z' suffix for Python < 3.11
        s_str = start_dateTime.replace('Z', '+00:00')
        e_str = end_dateTime.replace('Z', '+00:00')
        
        s_dt = datetime.fromisoformat(s_str)
        e_dt = datetime.fromisoformat(e_str)
        
        # Calculate duration in minutes
        diff = e_dt - s_dt
        duration = int(diff.total_seconds() / 60)
        
        # Format time as HH:MM
        time_str = s_dt.strftime("%H:%M")
        return time_str, duration
    except Exception as ex:
        print(f"Error parsing event datetimes: {ex}")
        # Fallback: parse from ISO string substring
        if len(start_dateTime) >= 16:
            time_str = start_dateTime[11:16]
            return time_str, 60
        return None, None

async def find_free_slot(date_str: str, duration_needed: int, skip_task_id=None) -> str:
    """
    Finds the earliest free slot of size duration_needed on date_str.
    Returns HH:MM format.
    """
    # Fetch all tasks on this date that are timed
    cursor = db.tasks.find({"user_id": user_id, "date": date_str, "time": {"$ne": None}, "duration": {"$ne": None}})
    tasks = await cursor.to_list(length=100)
    
    # Map tasks to (start_min, end_min) intervals
    occupied = []
    for t in tasks:
        if skip_task_id and str(t.get("_id")) == str(skip_task_id):
            continue
        try:
            h, m = map(int, t["time"].split(":"))
            start_min = h * 60 + m
            dur = t.get("duration", 60)
            occupied.append((start_min, start_min + dur))
        except Exception:
            continue
    
    # Sort occupied intervals by start time
    occupied.sort(key=lambda x: x[0])
    
    # Merge overlapping occupied intervals
    merged = []
    for interval in occupied:
        if not merged:
            merged.append(interval)
        else:
            prev = merged[-1]
            if interval[0] < prev[1]:
                # overlap, merge them
                merged[-1] = (prev[0], max(prev[1], interval[1]))
            else:
                merged.append(interval)
    
    # Define standard active hours: 08:00 (480 min) to 22:00 (1320 min)
    day_start = 8 * 60
    day_end = 22 * 60
    
    # Search in active hours first
    slot_start = day_start
    for start, end in merged:
        if start >= slot_start + duration_needed:
            # Found a gap before this interval
            return f"{slot_start // 60:02d}:{slot_start % 60:02d}"
        slot_start = max(slot_start, end)
    
    if slot_start + duration_needed <= day_end:
        # Found a gap after the last interval within active hours
        return f"{slot_start // 60:02d}:{slot_start % 60:02d}"
        
    # If not found in active hours, search the whole day: 00:00 to 24:00
    slot_start = 0
    for start, end in merged:
        if start >= slot_start + duration_needed:
            return f"{slot_start // 60:02d}:{slot_start % 60:02d}"
        slot_start = max(slot_start, end)
        
    if slot_start + duration_needed <= 24 * 60:
        return f"{slot_start // 60:02d}:{slot_start % 60:02d}"
        
    # Fallback: append at the end of the last task
    if merged:
        last_end = merged[-1][1]
        if last_end + duration_needed <= 24 * 60:
            return f"{last_end // 60:02d}:{last_end % 60:02d}"
    return "08:00" # Ultimate fallback

async def resolve_conflicts_for_calendar_task(date_str: str, time_str: str, duration: int) -> int:
    """
    Checks if there are any overlapping local tasks.
    If so, reschedules them to available slots on the same day.
    Returns the count of rescheduled tasks.
    """
    if not time_str or not duration:
        return 0
        
    try:
        h, m = map(int, time_str.split(":"))
        start_min = h * 60 + m
        end_min = start_min + duration
    except Exception:
        return 0
        
    rescheduled_count = 0
    
    # Query all local timed tasks on the same date
    cursor = db.tasks.find({"user_id": user_id, 
        "date": date_str,
        "time": {"$ne": None},
        "duration": {"$ne": None},
        "source": {"$ne": "google_calendar"} # Only reschedule local tasks
    })
    local_tasks = await cursor.to_list(length=100)
    
    for t in local_tasks:
        try:
            th, tm = map(int, t["time"].split(":"))
            t_start = th * 60 + tm
            t_end = t_start + t.get("duration", 60)
            
            # Check overlap
            if max(start_min, t_start) < min(end_min, t_end):
                # Overlap! Find a new slot for the local task `t`
                new_time_str = await find_free_slot(date_str, t.get("duration", 60), skip_task_id=t["_id"])
                
                # Update task in DB
                await db.tasks.update_one(
                    {"_id": t["_id"]},
                    {"$set": {"time": new_time_str}}
                )
                rescheduled_count += 1
        except Exception as ex:
            print(f"Error resolving conflict for task {t.get('_id')}: {ex}")
            continue
            
    return rescheduled_count

@router.post("/calendar/sync")
async def sync_calendar_events(payload: CalendarSyncPayload, user_id: str = Depends(get_current_user)):
    """
    Upserts Google Calendar events as tasks.
    Uses google_event_id to avoid duplicates.
    """
    created = 0
    updated = 0
    skipped = 0
    rescheduled = 0
    for event in payload.events:
        existing = await db.tasks.find_one({"user_id": user_id, "google_event_id": event.google_event_id})
        if existing:
            # Check if any timeline-relevant info has changed
            time_changed = (existing.get("time") != event.time) or (existing.get("duration") != event.duration) or (existing.get("date") != event.date) or (existing.get("title") != event.title)
            
            category = event.category
            if not category or category == "Routine" or category == "Auto":
                category = classify_task_category(event.title)
                
            await db.tasks.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "title":           event.title,
                    "category":        category,
                    "date":            event.date,
                    "time":            event.time,
                    "duration":        event.duration,
                }}
            )
            updated += 1
            
            # Resolve conflicts if time/duration/date changed
            if time_changed and event.time and event.duration:
                r_count = await resolve_conflicts_for_calendar_task(event.date, event.time, event.duration)
                rescheduled += r_count
            continue
            
        category = event.category
        if not category or category == "Routine" or category == "Auto":
            category = classify_task_category(event.title)
        task_doc = {
            "title":           event.title,
            "category":        category,
            "status":          "To-Do",
            "date":            event.date,
            "time":            event.time,
            "duration":        event.duration,
            "created_at":      datetime.now(timezone.utc),
            "google_event_id": event.google_event_id,
            "source":          "google_calendar"
        }
        await db.tasks.insert_one(task_doc)
        created += 1
        
        # Resolve conflicts
        if event.time and event.duration:
            r_count = await resolve_conflicts_for_calendar_task(event.date, event.time, event.duration)
            rescheduled += r_count
            
    return {"created": created, "updated": updated, "skipped": skipped, "rescheduled": rescheduled, "total": len(payload.events)}

@router.get("/calendar/status")
async def get_calendar_status(user_id: str = Depends(get_current_user)):
    """Returns count of synced calendar tasks."""
    count = await db.tasks.count_documents({"source": "google_calendar"})
    last  = await db.tasks.find_one({"user_id": user_id, "source": "google_calendar"}, sort=[("created_at", -1)])
    return {
        "synced_count": count,
        "last_sync": last["created_at"].isoformat() if last else None
    }

@router.get("/auth/google/callback")
async def google_callback(code: str, user_id: str = Depends(get_current_user)):
    """
    Google redirects here with ?code=...
    We exchange it for tokens, fetch calendar events, sync them.
    """
    async with httpx.AsyncClient() as client:
        # 1. Exchange code for tokens
        token_res = await client.post("https://oauth2.googleapis.com/token", data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        tokens = token_res.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token")

        # 2. Fetch next 30 days of calendar events
        time_min = datetime.now(timezone.utc).isoformat()
        time_max = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        cal_res = await client.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "timeMin":      time_min,
                "timeMax":      time_max,
                "singleEvents": "true",
                "orderBy":      "startTime",
                "maxResults":   "2500",
            }
        )
        cal_data = cal_res.json()
        events   = cal_data.get("items", [])

        # 3. Map events to tasks and sync
        mapped = []
        for e in events:
            start = e.get("start", {})
            date  = start.get("date") or start.get("dateTime", "")[:10]
            if not date:
                continue
            title = e.get("summary", "Untitled Event")
            
            # Parse timeline start and duration
            time_str, duration = parse_google_time_and_duration(e)
            
            mapped.append({
                "google_event_id": e["id"],
                "title":           title,
                "date":            date,
                "time":            time_str,
                "duration":        duration,
                "category":        classify_task_category(title),
            })

        created = updated = skipped = rescheduled = 0
        for ev in mapped:
            existing = await db.tasks.find_one({"user_id": user_id, "google_event_id": ev["google_event_id"]})
            if existing:
                # Check if any timeline-relevant info has changed
                time_changed = (existing.get("time") != ev["time"]) or (existing.get("duration") != ev["duration"]) or (existing.get("date") != ev["date"]) or (existing.get("title") != ev["title"])
                
                await db.tasks.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "title":           ev["title"],
                        "category":        ev["category"],
                        "date":            ev["date"],
                        "time":            ev["time"],
                        "duration":        ev["duration"],
                    }}
                )
                updated += 1
                
                if time_changed and ev.get("time") and ev.get("duration"):
                    r_count = await resolve_conflicts_for_calendar_task(ev["date"], ev["time"], ev["duration"])
                    rescheduled += r_count
                continue
            await db.tasks.insert_one({
                **ev,
                "status":     "To-Do",
                "created_at": datetime.now(timezone.utc),
                "source":     "google_calendar",
            })
            created += 1
            
            # Resolve conflicts for this newly added task
            if ev.get("time") and ev.get("duration"):
                r_count = await resolve_conflicts_for_calendar_task(ev["date"], ev["time"], ev["duration"])
                rescheduled += r_count

    # 4. Redirect back to frontend with result
    return RedirectResponse(f"{FRONTEND_URL}/?gcal_sync=success&created={created}&updated={updated}&skipped={skipped}&rescheduled={rescheduled}")

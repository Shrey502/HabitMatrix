from auth_utils import get_current_user
from fastapi import Depends
import os
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from database import supabase
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
    title: str
    date: str
    time: Optional[str] = None
    duration: Optional[int] = None
    category: Optional[str] = "Routine"

class CalendarSyncPayload(BaseModel):
    events: List[CalendarEvent]

def parse_google_time_and_duration(e: dict):
    start = e.get("start", {})
    end = e.get("end", {})
    start_dateTime = start.get("dateTime")
    end_dateTime = end.get("dateTime")
    if not start_dateTime or not end_dateTime:
        return None, None
    try:
        s_dt = datetime.fromisoformat(start_dateTime.replace('Z', '+00:00'))
        e_dt = datetime.fromisoformat(end_dateTime.replace('Z', '+00:00'))
        duration = int((e_dt - s_dt).total_seconds() / 60)
        time_str = s_dt.strftime("%H:%M")
        return time_str, duration
    except Exception as ex:
        print(f"Error parsing event datetimes: {ex}")
        if len(start_dateTime) >= 16:
            return start_dateTime[11:16], 60
        return None, None

def get_timed_tasks_on_date(user_id: str, date_str: str, skip_id: Optional[str] = None) -> list:
    res = supabase.table("tasks").select("id,time,duration").eq("user_id", user_id).eq("date", date_str).not_.is_("time", "null").not_.is_("duration", "null").execute()
    tasks = res.data or []
    if skip_id:
        tasks = [t for t in tasks if t["id"] != skip_id]
    return tasks

def find_free_slot(tasks: list, duration_needed: int) -> str:
    occupied = []
    for t in tasks:
        try:
            h, m = map(int, t["time"].split(":"))
            start_min = h * 60 + m
            occupied.append((start_min, start_min + (t.get("duration") or 60)))
        except Exception:
            continue
    occupied.sort(key=lambda x: x[0])
    merged = []
    for interval in occupied:
        if not merged:
            merged.append(interval)
        else:
            prev = merged[-1]
            if interval[0] < prev[1]:
                merged[-1] = (prev[0], max(prev[1], interval[1]))
            else:
                merged.append(interval)
    day_start, day_end = 8 * 60, 22 * 60
    slot_start = day_start
    for start, end in merged:
        if start >= slot_start + duration_needed:
            return f"{slot_start // 60:02d}:{slot_start % 60:02d}"
        slot_start = max(slot_start, end)
    if slot_start + duration_needed <= day_end:
        return f"{slot_start // 60:02d}:{slot_start % 60:02d}"
    return "08:00"

def resolve_conflicts(user_id: str, date_str: str, time_str: str, duration: int) -> int:
    if not time_str or not duration:
        return 0
    try:
        h, m = map(int, time_str.split(":"))
        start_min = h * 60 + m
        end_min = start_min + duration
    except Exception:
        return 0

    res = supabase.table("tasks").select("id,time,duration").eq("user_id", user_id).eq("date", date_str).not_.is_("time", "null").not_.is_("duration", "null").neq("source", "google_calendar").execute()
    local_tasks = res.data or []
    rescheduled = 0
    for t in local_tasks:
        try:
            th, tm = map(int, t["time"].split(":"))
            t_start = th * 60 + tm
            t_end = t_start + (t.get("duration") or 60)
            if max(start_min, t_start) < min(end_min, t_end):
                all_tasks = get_timed_tasks_on_date(user_id, date_str, skip_id=t["id"])
                new_time = find_free_slot(all_tasks, t.get("duration") or 60)
                supabase.table("tasks").update({"time": new_time}).eq("id", t["id"]).execute()
                rescheduled += 1
        except Exception as ex:
            print(f"Conflict resolution error: {ex}")
    return rescheduled

@router.post("/calendar/sync")
async def sync_calendar_events(payload: CalendarSyncPayload, user_id: str = Depends(get_current_user)):
    created = updated = skipped = rescheduled = 0
    for event in payload.events:
        res = supabase.table("tasks").select("*").eq("user_id", user_id).eq("google_event_id", event.google_event_id).execute()
        existing = res.data[0] if res.data else None

        category = event.category
        if not category or category in ("Routine", "Auto"):
            category = classify_task_category(event.title)

        if existing:
            time_changed = (existing.get("time") != event.time or existing.get("duration") != event.duration
                            or existing.get("date") != event.date or existing.get("title") != event.title)
            supabase.table("tasks").update({
                "title": event.title, "category": category,
                "date": event.date, "time": event.time, "duration": event.duration,
            }).eq("id", existing["id"]).execute()
            updated += 1
            if time_changed and event.time and event.duration:
                rescheduled += resolve_conflicts(user_id, event.date, event.time, event.duration)
        else:
            supabase.table("tasks").insert({
                "user_id": user_id, "title": event.title, "category": category,
                "status": "To-Do", "date": event.date, "time": event.time,
                "duration": event.duration, "google_event_id": event.google_event_id, "source": "google_calendar",
            }).execute()
            created += 1
            if event.time and event.duration:
                rescheduled += resolve_conflicts(user_id, event.date, event.time, event.duration)

    return {"created": created, "updated": updated, "skipped": skipped, "rescheduled": rescheduled, "total": len(payload.events)}

@router.get("/calendar/status")
async def get_calendar_status(user_id: str = Depends(get_current_user)):
    res = supabase.table("tasks").select("created_at").eq("user_id", user_id).eq("source", "google_calendar").order("created_at", desc=True).limit(1).execute()
    count_res = supabase.table("tasks").select("id", count="exact").eq("user_id", user_id).eq("source", "google_calendar").execute()
    count = count_res.count or 0
    last = res.data[0]["created_at"] if res.data else None
    return {"synced_count": count, "last_sync": last}

@router.get("/auth/google/callback")
async def google_callback(code: str, user_id: str = Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        token_res = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code, "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI, "grant_type": "authorization_code",
        })
        tokens = token_res.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token")

        time_min = datetime.now(timezone.utc).isoformat()
        time_max = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        cal_res = await client.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"timeMin": time_min, "timeMax": time_max, "singleEvents": "true",
                    "orderBy": "startTime", "maxResults": "2500"},
        )
        events = cal_res.json().get("items", [])

        created = updated = skipped = rescheduled = 0
        for e in events:
            start = e.get("start", {})
            date = start.get("date") or start.get("dateTime", "")[:10]
            if not date:
                continue
            title = e.get("summary", "Untitled Event")
            time_str, duration = parse_google_time_and_duration(e)
            category = classify_task_category(title)

            res = supabase.table("tasks").select("*").eq("user_id", user_id).eq("google_event_id", e["id"]).execute()
            existing = res.data[0] if res.data else None
            if existing:
                time_changed = (existing.get("time") != time_str or existing.get("duration") != duration
                                or existing.get("date") != date or existing.get("title") != title)
                supabase.table("tasks").update({
                    "title": title, "category": category, "date": date, "time": time_str, "duration": duration,
                }).eq("id", existing["id"]).execute()
                updated += 1
                if time_changed and time_str and duration:
                    rescheduled += resolve_conflicts(user_id, date, time_str, duration)
            else:
                supabase.table("tasks").insert({
                    "user_id": user_id, "title": title, "category": category, "status": "To-Do",
                    "date": date, "time": time_str, "duration": duration,
                    "google_event_id": e["id"], "source": "google_calendar",
                }).execute()
                created += 1
                if time_str and duration:
                    rescheduled += resolve_conflicts(user_id, date, time_str, duration)

    return RedirectResponse(f"{FRONTEND_URL}/?gcal_sync=success&created={created}&updated={updated}&skipped={skipped}&rescheduled={rescheduled}")

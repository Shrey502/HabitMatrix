from auth_utils import get_current_user
from fastapi import Depends, APIRouter, HTTPException
from models import JournalBase, JournalDB
from database import supabase

router = APIRouter()

@router.get("/journal", response_model=list[JournalDB])
async def get_journals(user_id: str = Depends(get_current_user)):
    res = supabase.table("journals").select("*").eq("user_id", user_id).order("date", desc=True).limit(365).execute()
    return res.data or []

@router.get("/journal/{date}", response_model=JournalDB)
async def get_journal_by_date(date: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("journals").select("*").eq("user_id", user_id).eq("date", date).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Journal not found")
    return res.data

@router.post("/journal", response_model=JournalDB)
async def upsert_journal(journal: JournalBase, user_id: str = Depends(get_current_user)):
    journal_dict = journal.model_dump()
    journal_dict["user_id"] = user_id
    # Upsert by user_id + date (unique constraint in DB)
    res = supabase.table("journals").upsert(journal_dict, on_conflict="user_id,date").execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save journal")
    return res.data[0]

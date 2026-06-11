from auth_utils import get_current_user
from fastapi import Depends
from fastapi import APIRouter, HTTPException
from models import JournalBase, JournalDB
from database import db
from bson import ObjectId

router = APIRouter()

@router.get("/journal", response_model=list[JournalDB])
async def get_journals(user_id: str = Depends(get_current_user)):
    journals = await db.journals.find().sort("date", -1).to_list(365)
    return journals

@router.get("/journal/{date}", response_model=JournalDB)
async def get_journal_by_date(date: str, user_id: str = Depends(get_current_user)):
    journal = await db.journals.find_one({"user_id": user_id, "date": date})
    if journal: return journal
    raise HTTPException(status_code=404, detail="Journal not found")

@router.post("/journal", response_model=JournalDB)
async def upsert_journal(journal: JournalBase, user_id: str = Depends(get_current_user)):
    journal_dict = journal.model_dump()
    journal_dict["user_id"] = user_id
    # Upsert by date
    await db.journals.update_one(
        {"date": journal.date},
        {"$set": journal_dict},
        upsert=True
    )
    created = await db.journals.find_one({"user_id": user_id, "date": journal.date})
    return created

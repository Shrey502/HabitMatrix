from fastapi import APIRouter, HTTPException
from models import JournalBase, JournalDB
from database import db
from bson import ObjectId

router = APIRouter()

@router.get("/journal", response_model=list[JournalDB])
async def get_journals():
    journals = await db.journals.find().sort("date", -1).to_list(365)
    return journals

@router.get("/journal/{date}", response_model=JournalDB)
async def get_journal_by_date(date: str):
    journal = await db.journals.find_one({"date": date})
    if journal: return journal
    raise HTTPException(status_code=404, detail="Journal not found")

@router.post("/journal", response_model=JournalDB)
async def upsert_journal(journal: JournalBase):
    journal_dict = journal.model_dump()
    # Upsert by date
    await db.journals.update_one(
        {"date": journal.date},
        {"$set": journal_dict},
        upsert=True
    )
    created = await db.journals.find_one({"date": journal.date})
    return created

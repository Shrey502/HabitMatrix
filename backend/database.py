import os
import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# ADD tlsAllowInvalidCertificates=True to bypass strict local Windows checks
client = AsyncIOMotorClient(
    MONGO_URI, 
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=True 
)

db = client["habit-tracker"]

async def create_indexes():
    await db.tasks.create_index([("user_id", 1), ("date", 1)])
    await db.journals.create_index("user_id")
    await db.goals.create_index("user_id")
    await db.routines.create_index("user_id")
    await db.notifications.create_index("user_id")
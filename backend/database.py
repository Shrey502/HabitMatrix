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
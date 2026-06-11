from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tasks, analytics, notifications, goals, journal, routines, calendar, auth

import os
from contextlib import asynccontextmanager
from database import create_indexes

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_indexes()
    yield

app = FastAPI(title="Habit Tracker API", lifespan=lifespan)

allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002")
allowed_origins = [o.strip() for o in allowed_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in allowed_origins else allowed_origins,
    allow_credentials=True if "*" not in allowed_origins else False, # allow_credentials cannot be true if origins is *
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(journal.router, prefix="/api")
app.include_router(routines.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")

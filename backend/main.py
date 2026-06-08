from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tasks, analytics, notifications, goals, journal, routines, calendar

app = FastAPI(title="Habit Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(journal.router, prefix="/api")
app.include_router(routines.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")

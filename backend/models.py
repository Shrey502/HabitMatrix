from pydantic import BaseModel, computed_field
from typing import Optional
from enum import Enum
from datetime import datetime, timezone

class Category(str, Enum):
    DEVELOPMENT = 'Development'
    HEALTH = 'Health'
    MINDSET = 'Mindset'
    ROUTINE = 'Routine'
    OTHERS = 'Others'
    AUTO = 'Auto'

class Status(str, Enum):
    TODO = 'To-Do'
    IN_PROGRESS = 'In Progress'
    DONE = 'Done'

class TaskBase(BaseModel):
    user_id: Optional[str] = None
    title: str
    category: Category
    status: Status = Status.TODO
    date: str  # YYYY-MM-DD
    time: Optional[str] = None
    duration: Optional[int] = None
    reminder_minutes: Optional[int] = 15
    routine_id: Optional[str] = None

class TaskDB(TaskBase):
    id: Optional[str] = None
    created_at: Optional[str] = None

    @computed_field
    @property
    def _id(self) -> Optional[str]:
        return self.id

class TaskUpdateStatus(BaseModel):
    status: Status

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[Category] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[int] = None
    reminder_minutes: Optional[int] = None

class GoalNodeBase(BaseModel):
    user_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: Status = Status.TODO
    parent_id: Optional[str] = None
    color: Optional[str] = "#38bdf8"
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    connections: list[str] = []

class GoalNodeDB(GoalNodeBase):
    id: Optional[str] = None
    created_at: Optional[str] = None

    @computed_field
    @property
    def _id(self) -> Optional[str]:
        return self.id

class GoalNodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Status] = None
    parent_id: Optional[str] = None
    color: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    connections: Optional[list[str]] = None

class JournalBase(BaseModel):
    user_id: Optional[str] = None
    date: str
    mood_score: int
    energy_score: int
    reflection: str
    tags: list[str] = []

class JournalDB(JournalBase):
    id: Optional[str] = None
    created_at: Optional[str] = None

    @computed_field
    @property
    def _id(self) -> Optional[str]:
        return self.id

class RoutineBase(BaseModel):
    user_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    tasks: list[dict] = []

class RoutineDB(RoutineBase):
    id: Optional[str] = None
    created_at: Optional[str] = None

    @computed_field
    @property
    def _id(self) -> Optional[str]:
        return self.id

class UserSettings(BaseModel):
    theme: str = "dark"
    notification_prefs: dict = {}
    pomodoro_duration: int = 25
    break_duration: int = 5
    timezone: str = "UTC"
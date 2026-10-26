
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine,
    String,
    DateTime,
    Integer,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

router = APIRouter(prefix="/tasks", tags=["Tasks"])

DATABASE_URL = "sqlite:///./butterfly.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Pending")
    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class TaskStatusAudit(Base):
    __tablename__ = "task_status_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(Integer, index=True)
    old_status: Mapped[str] = mapped_column(String(30))
    new_status: Mapped[str] = mapped_column(String(30))
    actor: Mapped[str] = mapped_column(String(100), default="prototype-user")
    changed_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


Base.metadata.create_all(bind=engine)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class StatusUpdate(BaseModel):
    status: Literal["Pending", "In Progress", "Completed", "Blocked"]


def serialize_task(task: Task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "due_date": task.due_date,
        "created_at": task.created_at,
    }


@router.post("/", status_code=201)
def create_task(data: TaskCreate):
    with SessionLocal() as db:
        task = Task(**data.model_dump())
        db.add(task)
        db.commit()
        db.refresh(task)
        return serialize_task(task)


@router.get("/")
def list_tasks():
    with SessionLocal() as db:
        tasks = db.query(Task).order_by(Task.id).all()
        return [serialize_task(task) for task in tasks]


@router.get("/{task_id}")
def get_task(task_id: int):
    with SessionLocal() as db:
        task = db.get(Task, task_id)

        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")

        return serialize_task(task)


@router.patch("/{task_id}/status")
def update_task_status(task_id: int, data: StatusUpdate):
    with SessionLocal() as db:
        task = db.get(Task, task_id)

        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")

        old_status = task.status

        if old_status != data.status:
            task.status = data.status

            audit_entry = TaskStatusAudit(
                task_id=task.id,
                old_status=old_status,
                new_status=data.status,
                actor="prototype-user",
            )
            db.add(audit_entry)
            db.commit()
            db.refresh(task)

        return serialize_task(task)


@router.get("/{task_id}/history")
def get_task_status_history(task_id: int):
    with SessionLocal() as db:
        task = db.get(Task, task_id)

        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")

        entries = (
            db.query(TaskStatusAudit)
            .filter(TaskStatusAudit.task_id == task_id)
            .order_by(TaskStatusAudit.id)
            .all()
        )

        return [
            {
                "task_id": entry.task_id,
                "old_status": entry.old_status,
                "new_status": entry.new_status,
                "actor": entry.actor,
                "changed_at": entry.changed_at,
            }
            for entry in entries
        ]

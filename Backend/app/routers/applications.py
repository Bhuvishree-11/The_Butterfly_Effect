
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, String, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

router = APIRouter(prefix="/applications", tags=["Applications"])

DATABASE_URL = "sqlite:///./butterfly.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    institution: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(50), default="Pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


Base.metadata.create_all(bind=engine)


class ApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    institution: str = Field(min_length=1, max_length=200)
    status: str = "Pending"


class ApplicationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    institution: Optional[str] = Field(default=None, min_length=1, max_length=200)
    status: Optional[str] = None


def serialize_application(application: Application):
    return {
        "id": application.id,
        "name": application.name,
        "institution": application.institution,
        "status": application.status,
        "created_at": application.created_at,
    }


@router.post("/", status_code=201)
def create_application(data: ApplicationCreate):
    with SessionLocal() as db:
        application = Application(**data.model_dump())
        db.add(application)
        db.commit()
        db.refresh(application)
        return serialize_application(application)


@router.get("/")
def list_applications():
    with SessionLocal() as db:
        applications = db.query(Application).order_by(Application.id).all()
        return [serialize_application(item) for item in applications]


@router.get("/{application_id}")
def get_application(application_id: int):
    with SessionLocal() as db:
        application = db.get(Application, application_id)
        if application is None:
            raise HTTPException(status_code=404, detail="Application not found")
        return serialize_application(application)


@router.patch("/{application_id}")
def update_application(application_id: int, data: ApplicationUpdate):
    with SessionLocal() as db:
        application = db.get(Application, application_id)
        if application is None:
            raise HTTPException(status_code=404, detail="Application not found")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(application, field, value)

        db.commit()
        db.refresh(application)
        return serialize_application(application)

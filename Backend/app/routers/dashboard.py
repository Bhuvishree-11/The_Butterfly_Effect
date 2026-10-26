
from fastapi import APIRouter
from sqlalchemy import func

from app.routers.applications import Application, SessionLocal
from app.routers.tasks import Task

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary():
    with SessionLocal() as db:
        total_applications = db.query(Application).count()

        applications_by_status = (
            db.query(Application.status, func.count(Application.id))
            .group_by(Application.status)
            .all()
        )

        total_tasks = db.query(Task).count()

        tasks_by_status = (
            db.query(Task.status, func.count(Task.id))
            .group_by(Task.status)
            .all()
        )

        return {
            "total_applications": total_applications,
            "applications_by_status": {
                status: count for status, count in applications_by_status
            },
            "total_tasks": total_tasks,
            "tasks_by_status": {
                status: count for status, count in tasks_by_status
            },
        }

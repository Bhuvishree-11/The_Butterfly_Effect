
from fastapi import APIRouter
from app.routers.applications import Application, SessionLocal
from app.routers.tasks import Task

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
def get_report_summary():
    with SessionLocal() as db:
        total_applications = db.query(Application).count()
        total_tasks = db.query(Task).count()

        return {
            "total_applications": total_applications,
            "total_tasks": total_tasks,
            "applications_by_status": {
                status: count
                for status, count in (
                    db.query(
                        Application.status,
                        __import__("sqlalchemy").func.count(
                            Application.id
                        )
                    )
                    .group_by(Application.status)
                    .all()
                )
            },
            "tasks_by_status": {
                status: count
                for status, count in (
                    db.query(
                        Task.status,
                        __import__("sqlalchemy").func.count(Task.id)
                    )
                    .group_by(Task.status)
                    .all()
                )
            }
        }

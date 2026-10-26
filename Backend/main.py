
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.applications import router as applications_router
from app.routers.tasks import router as tasks_router
from app.routers.dashboard import router as dashboard_router
from app.routers.reports import router as reports_router


app = FastAPI(
    title="The Butterfly Effect API",
    description="AICTE approval workflow and compliance monitoring",
    version="1.0.0",
)

# Allow the local React/Vite frontend to access the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers.
app.include_router(dashboard_router)
app.include_router(applications_router)
app.include_router(tasks_router)
app.include_router(reports_router)


@app.get("/")
def home():
    return {"message": "The Butterfly Effect API is running!"}

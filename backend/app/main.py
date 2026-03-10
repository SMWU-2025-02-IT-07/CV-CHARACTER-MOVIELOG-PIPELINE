from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.routers.health import router as health_router
from app.routers.scenarios import router as scenarios_router
from app.routers.characters import router as characters_router
from app.routers.comfyui import router as comfyui_router
from app.routers.library import router as library_router
from app.routers import jobs
from app.core.errors import register_exception_handlers

app = FastAPI(title="CV Character Movielog Backend", version="0.1.0")

# CORS 설정 (하나로 통합)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:3000",
        "https://d1otafw1wb5gvu.cloudfront.net"
    ] + settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(scenarios_router, prefix="/api/v1")
app.include_router(characters_router, prefix="/api/v1")
app.include_router(comfyui_router, prefix="/api/v1")
app.include_router(library_router, prefix="/api/v1") 
app.include_router(jobs.router, prefix="/api/v1")

register_exception_handlers(app)

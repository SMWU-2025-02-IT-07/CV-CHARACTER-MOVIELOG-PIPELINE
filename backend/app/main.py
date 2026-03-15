from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.health import router as health_router
from app.routers.scenarios import router as scenarios_router
from app.routers.characters import router as characters_router
from app.routers.comfyui import router as comfyui_router
from app.routers.jobs import router as jobs_router
from app.routers.scenes import router as scenes_router
from app.core.errors import register_exception_handlers

# Video merge router import
try:
    from app.routers.video_merge import router as video_merge_router
    VIDEO_MERGE_AVAILABLE = True
    print("✓ Video merge router loaded successfully")
except Exception as e:
    print(f"✗ Failed to load video merge router: {e}")
    VIDEO_MERGE_AVAILABLE = False

# TTS router import
try:
    from app.routers.tts import router as tts_router
    TTS_AVAILABLE = True
    print("✓ TTS router loaded successfully")
except Exception as e:
    print(f"✗ Failed to load TTS router: {e}")
    TTS_AVAILABLE = False

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
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(scenes_router, prefix="/api/v1")

if VIDEO_MERGE_AVAILABLE:
    app.include_router(video_merge_router, prefix="/api/v1")
    print("✓ Video merge endpoints registered at /api/v1/video-merge")
else:
    print("✗ Video merge endpoints not available")

if TTS_AVAILABLE:
    app.include_router(tts_router, prefix="/api/v1")
    print("✓ TTS endpoints registered at /api/v1/tts")
else:
    print("✗ TTS endpoints not available")

register_exception_handlers(app)

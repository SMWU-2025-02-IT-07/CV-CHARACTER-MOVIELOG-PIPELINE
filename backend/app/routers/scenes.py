from fastapi import APIRouter
from pydantic import BaseModel

from app.services.scenario_service import update_scene_result

router = APIRouter(prefix="/scenes", tags=["scenes"])


class SceneCompleteRequest(BaseModel):
    scenario_id: str
    scene_id: int
    video_url: str
    status: str


@router.post("/complete")
async def scene_complete(req: SceneCompleteRequest):
    """Receive scene completion notifications from the ML server."""
    try:
        update_scene_result(
            scenario_id=req.scenario_id,
            scene_id=req.scene_id,
            video_url=req.video_url,
        )

        print(f"Scene {req.scene_id} completed for scenario {req.scenario_id}")
        print(f"Video URL: {req.video_url}")
        return {"status": "success", "message": "Scene metadata updated"}
    except Exception as e:
        print(f"Failed to update scene metadata: {e}")
        return {"status": "error", "message": str(e)}

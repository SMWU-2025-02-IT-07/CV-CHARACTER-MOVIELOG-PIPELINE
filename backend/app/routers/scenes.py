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
    """ml-server에서 씬 완료 알림을 받는 엔드포인트"""
    try:
        print(f"Received scene completion notification:")
        print(f"  Scenario ID: {req.scenario_id}")
        print(f"  Scene ID: {req.scene_id}")
        print(f"  Video URL: {req.video_url}")
        print(f"  Status: {req.status}")
        
        # 시나리오 메타데이터 업데이트
        update_scene_result(
            scenario_id=req.scenario_id,
            scene_id=req.scene_id,
            video_url=req.video_url
        )
        
        print(f"Scene {req.scene_id} completed for scenario {req.scenario_id}")
        print(f"Video URL: {req.video_url}")
        
        return {"status": "success", "message": "Scene metadata updated"}
    
    except Exception as e:
        print(f"Failed to update scene metadata: {e}")
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}
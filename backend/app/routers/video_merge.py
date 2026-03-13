from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from app.services.video_merge_service import (
    merge_scenario_videos,
    check_merge_prerequisites,
    get_merge_status
)

router = APIRouter(prefix="/video-merge", tags=["video-merge"])


class MergeRequest(BaseModel):
    scenario_id: str
    force_merge: bool = False  # 일부 씬이 없어도 강제 병합


class MergeResponse(BaseModel):
    status: str
    message: str
    final_video_url: Optional[str] = None
    scene_count: Optional[int] = None
    merged_scenes: Optional[list] = None


@router.get("/check/{scenario_id}")
async def check_merge_readiness(scenario_id: str):
    """비디오 병합 가능 여부 확인"""
    try:
        print(f"\\n=== 병합 가능 여부 확인 요청: {scenario_id} ===")
        
        result = check_merge_prerequisites(scenario_id)
        
        print(f"확인 결과:")
        print(f"  - 전체 씬: {result['total_scenes']}")
        print(f"  - 비디오 있는 씬: {result['scenes_with_video']}")
        print(f"  - FFmpeg 사용 가능: {result['ffmpeg_available']}")
        print(f"  - 병합 준비 완료: {result['ready_for_merge']}")
        
        return result
        
    except Exception as e:
        print(f"병합 가능 여부 확인 실패: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/merge", response_model=MergeResponse)
async def merge_videos(request: MergeRequest):
    """시나리오의 모든 씬 비디오를 병합"""
    try:
        print(f"\\n=== 비디오 병합 요청 ===")
        print(f"시나리오 ID: {request.scenario_id}")
        print(f"강제 병합: {request.force_merge}")
        
        # 사전 조건 확인
        if not request.force_merge:
            prerequisites = check_merge_prerequisites(request.scenario_id)
            
            if not prerequisites['ready_for_merge']:
                missing_requirements = []
                if prerequisites['scenes_with_video'] == 0:
                    missing_requirements.append("비디오가 있는 씬이 없음")
                if not prerequisites['ffmpeg_available']:
                    missing_requirements.append("FFmpeg 사용 불가")
                
                error_msg = f"병합 조건 미충족: {', '.join(missing_requirements)}"
                print(f"병합 중단: {error_msg}")
                
                return MergeResponse(
                    status="error",
                    message=error_msg
                )
        
        # 비디오 병합 실행
        print(f"비디오 병합 시작...")
        result = merge_scenario_videos(request.scenario_id)
        
        print(f"병합 결과: {result}")
        
        return MergeResponse(
            status=result["status"],
            message=result["message"],
            final_video_url=result.get("final_video_url"),
            scene_count=result.get("scene_count"),
            merged_scenes=result.get("merged_scenes")
        )
        
    except Exception as e:
        print(f"비디오 병합 실패: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/merge-async/{scenario_id}")
async def merge_videos_async(scenario_id: str, background_tasks: BackgroundTasks, force_merge: bool = False):
    """비디오 병합을 백그라운드에서 비동기 실행"""
    try:
        print(f"\\n=== 비동기 비디오 병합 요청 ===")
        print(f"시나리오 ID: {scenario_id}")
        print(f"강제 병합: {force_merge}")
        
        # 사전 조건 확인 (force_merge가 아닌 경우)
        if not force_merge:
            prerequisites = check_merge_prerequisites(scenario_id)
            if not prerequisites['ready_for_merge']:
                return {
                    "status": "error",
                    "message": "병합 조건 미충족",
                    "details": prerequisites
                }
        
        # 백그라운드 태스크로 병합 실행
        background_tasks.add_task(background_merge_task, scenario_id)
        
        return {
            "status": "accepted",
            "message": "비디오 병합이 백그라운드에서 시작되었습니다",
            "scenario_id": scenario_id
        }
        
    except Exception as e:
        print(f"비동기 병합 요청 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def background_merge_task(scenario_id: str):
    """백그라운드에서 실행되는 병합 태스크"""
    try:
        print(f"\\n=== 백그라운드 병합 태스크 시작: {scenario_id} ===")
        
        result = merge_scenario_videos(scenario_id)
        
        print(f"백그라운드 병합 완료: {result}")
        
        # 완료 알림: 프론트엔드는 /status/{scenario_id} 엔드포인트를 폴링하여 상태 확인
        # 추가 알림이 필요한 경우 여기에 웹소켓/이메일 로직 추가 가능
        
    except Exception as e:
        print(f"백그라운드 병합 실패: {scenario_id} - {e}")
        import traceback
        print(traceback.format_exc())
        
        # 실패 알림: 프론트엔드는 /status/{scenario_id}에서 error 상태 확인 가능




@router.get("/status/{scenario_id}")
async def get_merge_status_endpoint(scenario_id: str):
    """병합 상태 확인 - ML 서버에서 실시간 진행률 조회
    
    프론트엔드 연동 방법:
    1. /merge 엔드포인트로 병합 시작
    2. 2초마다 이 엔드포인트를 폴링하여 상태 확인
    3. status가 'completed'이면 final_video_url 사용
    4. status가 'error'이면 에러 메시지 표시
    
    응답 예시:
    {
        "status": "processing",  // pending, processing, completed, error
        "progress": 45,           // 0-100
        "message": "Merging videos...",
        "final_video_url": "https://..."  // completed일 때만
    }
    """
    try:
        print(f"\n=== 병합 상태 확인 요청: {scenario_id} ===")
        
        result = get_merge_status(scenario_id)
        
        print(f"상태 확인 결과: {result}")
        
        return result
        
    except Exception as e:
        print(f"병합 상태 확인 실패: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cancel/{scenario_id}")
async def cancel_merge(scenario_id: str):
    """병합 작업 취소 (향후 구현)"""
    # TODO: 진행 중인 병합 작업 취소 기능 구현
    return {
        "status": "not_implemented", 
        "message": "병합 취소 기능은 향후 구현 예정입니다"
    }
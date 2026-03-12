from fastapi import APIRouter, Query
import traceback

from app.schemas.scenario import (
    CreateScenarioRequest,
    CreateScenarioResponse,
    RegenerateScenarioRequest,
    RegenerateScenarioResponse,
)
from app.services.scenario_service import (
    create_scenario,
    get_scenario,
    list_scenarios,
    regenerate_scenario,
)

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

@router.post("", response_model=CreateScenarioResponse)
def create(req: CreateScenarioRequest):
    try:
        print(f"\n=== 시나리오 생성 요청 ===")
        print(f"캐릭터: {req.character.name}")
        print(f"브리프: {req.brief.who} {req.brief.where} {req.brief.what} {req.brief.how}")
        print(f"옵션: 씬 수={req.options.scene_count}, 언어={req.options.lang}")
        
        result = create_scenario(req)
        
        print(f"\n=== Bedrock 응답 결과 ===")
        print(f"시나리오 ID: {result.scenario_id}")
        for i, scene in enumerate(result.scenes, 1):
            print(f"\n[씬 {i}]")
            print(f"  제목: {scene.title}")
            print(f"  설명: {scene.description}")
            print(f"  지속시간: {scene.duration}초")
            print(f"  이미지 프롬프트: {scene.image_prompt}")
            print(f"  비디오 프롬프트: {scene.video_prompt}")
        print(f"\n=== 완료 ===")
        
        return result
    except Exception as e:
        print(f"Error in create endpoint: {e}")
        print(traceback.format_exc())
        raise


@router.get("/{scenario_id}", response_model=CreateScenarioResponse)
def get_one(scenario_id: str):
    try:
        print(f"\n=== 시나리오 조회 요청 ===")
        print(f"시나리오 ID: {scenario_id}")
        
        result = get_scenario(scenario_id)
        
        print(f"시나리오 조회 성공: {len(result.scenes)}개 씬")
        return result
    except Exception as e:
        print(f"Error in get_one endpoint: {e}")
        print(traceback.format_exc())
        raise


@router.get("", response_model=list[CreateScenarioResponse])
def list_all(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return list_scenarios(limit=limit, offset=offset)


@router.post("/{scenario_id}/regenerate", response_model=RegenerateScenarioResponse)
def regenerate(scenario_id: str, req: RegenerateScenarioRequest):
    return regenerate_scenario(scenario_id, req)
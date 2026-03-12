from fastapi import APIRouter, Query, HTTPException
import traceback

from app.schemas.scenario import (
    CreateScenarioRequest,
    CreateScenarioResponse,
    RegenerateScenarioRequest,
    RegenerateScenarioResponse,
)

from app.schemas.library import LibraryScenarioSummary, LibraryScenarioDetail

from app.services.scenario_service import (
    create_scenario,
    get_scenario,
    list_scenarios,
    regenerate_scenario,
)

from app.services.scenario_library_service import (
    list_scenarios,
    load_scenario_metadata,
)

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

# =========================
# 생성 API
# =========================
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
    rows = list_scenarios(limit=limit, offset=offset)
    result = []

    for row in rows:
        result.append(
            LibraryScenarioSummary(
                scenario_id=row["scenario_id"],
                title=row.get("title", row.get("brief", "Untitled Scenario")),
                created_at=row["created_at"],
                updated_at=row.get("updated_at"),
                status=row.get("status", "pending"),
                thumbnail_url=row.get("thumbnail_url"),
                final_video_url=row.get("final_video_url"),
            )
        )

    return result


@router.get("/{scenario_id}", response_model=LibraryScenarioDetail)
def get_one(scenario_id: str):
    row = load_scenario_metadata(scenario_id)
    if not row:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return LibraryScenarioDetail(
        scenario_id=row["scenario_id"],
        title=row.get("title", row.get("brief", "Untitled Scenario")),
        brief=row.get("brief", ""),
        created_at=row["created_at"],
        updated_at=row.get("updated_at"),
        status=row.get("status", "pending"),
        thumbnail_url=row.get("thumbnail_url"),
        final_video_url=row.get("final_video_url"),
        scenes=row.get("scenes", []),
    )


@router.post("/{scenario_id}/regenerate", response_model=RegenerateScenarioResponse)
def regenerate(scenario_id: str, req: RegenerateScenarioRequest):
    return regenerate_scenario(scenario_id, req)
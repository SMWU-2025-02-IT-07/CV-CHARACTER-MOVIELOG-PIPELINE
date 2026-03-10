from fastapi import APIRouter
from app.services.scenario_library_service import list_scenarios, load_scenario_metadata
from app.schemas.library import LibraryScenarioSummary, LibraryScenarioDetail

router = APIRouter(prefix="/scenarios", tags=["library"])

@router.get("", response_model=list[LibraryScenarioSummary])
def get_scenarios():
    rows = list_scenarios()
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
def get_scenario_detail(scenario_id: str):
    row = load_scenario_metadata(scenario_id)

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
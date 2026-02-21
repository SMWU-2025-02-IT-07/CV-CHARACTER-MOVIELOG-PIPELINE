from fastapi import APIRouter, Query

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
    return create_scenario(req)


@router.get("/{scenario_id}", response_model=CreateScenarioResponse)
def get_one(scenario_id: str):
    return get_scenario(scenario_id)


@router.get("", response_model=list[CreateScenarioResponse])
def list_all(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return list_scenarios(limit=limit, offset=offset)


@router.post("/{scenario_id}/regenerate", response_model=RegenerateScenarioResponse)
def regenerate(scenario_id: str, req: RegenerateScenarioRequest):
    return regenerate_scenario(scenario_id, req)
import uuid
from pathlib import Path
import json
from fastapi import APIRouter
from app.schemas.scenario import (
    CreateScenarioRequest, CreateScenarioResponse,
    RegenerateScenarioRequest, RegenerateScenarioResponse
)
from app.services.llm_openai import generate_scenes_json
from app.services.scenario_service import (
    build_prompt_for_create, validate_and_normalize_scenes,
    build_prompt_for_regenerate
)
from app.core.errors import AppError

router = APIRouter(tags=["scenarios"])

@router.post("/scenarios", response_model=CreateScenarioResponse)
def create_scenario(req: CreateScenarioRequest):
    scene_count = req.options.scene_count or 3
    if scene_count != 3:
        # MVP: 프론트가 3장면이라 일단 고정 (원하면 풀자)
        raise AppError("INVALID_REQUEST", "scene_count must be 3 for MVP", status_code=400)

    prompt = build_prompt_for_create(
        name=req.character.name,
        image_url=str(req.character.image_url),
        brief=req.brief,
        scene_count=scene_count,
        lang=req.options.lang,
    )
    payload = generate_scenes_json(prompt)
    scenes = validate_and_normalize_scenes(payload, scene_count=scene_count)

    scenario_id = "scn_" + uuid.uuid4().hex[:12]

    DATA_DIR = Path("data/scenarios")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    scenario_dict = {
        "scenario_id": scenario_id,
        "scenes": [s.model_dump() for s in scenes],  # pydantic v2
    }

    (DATA_DIR / f"{scenario_id}.json").write_text(
        json.dumps(scenario_dict, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return CreateScenarioResponse(
        content={"scenario_id": scenario_id, "scenes": [s.model_dump() for s in scenes]},
        media_type="application/json; charset=utf-8",
    )

@router.post("/scenarios/{scenario_id}/regenerate", response_model=RegenerateScenarioResponse)
def regenerate_scenario(scenario_id: str, req: RegenerateScenarioRequest):
    if len(req.scenes) != 3:
        raise AppError("INVALID_REQUEST", "scenes must contain 3 items", status_code=400)

    scenes_for_prompt = [{"id": s.id, "description": s.description} for s in req.scenes]
    prompt = build_prompt_for_regenerate(
        scenes=scenes_for_prompt,
        character_image_url=str(req.character_image_url),
        lang=req.options.lang,
    )
    payload = generate_scenes_json(prompt)
    scenes = validate_and_normalize_scenes(payload, scene_count=3)

    return RegenerateScenarioResponse(
        content={"scenario_id": scenario_id, "scenes": [s.model_dump() for s in scenes]},
        media_type="application/json; charset=utf-8",
    )
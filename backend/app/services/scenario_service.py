from __future__ import annotations

import json
from uuid import uuid4
from pathlib import Path
from typing import Optional, List

from app.core.config import settings
from app.core.errors import AppError
from app.schemas.scenario import (
    CreateScenarioRequest,
    CreateScenarioResponse,
    RegenerateScenarioRequest,
    RegenerateScenarioResponse,
    SceneOut,
)
from app.services.llm_openai import generate_scenes_json


def _ensure_dir() -> Path:
    d = Path(settings.scenarios_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _scenario_path(scenario_id: str) -> Path:
    d = _ensure_dir()
    return d / f"{scenario_id}.json"

def _build_create_prompt(req: CreateScenarioRequest) -> str:
    sc = req.options.scene_count
    lang = req.options.lang

    # brief를 한 문장으로 고정 (행동 범위 고정용)
    anchor = f"{req.character.name}가 {req.brief.where} {req.brief.what} {req.brief.how}"

    return f"""
You create simple, realistic storyboard scenes for a short video.
Language: {lang}

OUTPUT MUST BE VALID JSON ONLY with this schema:
{{"scenes":[{{"id":1,"title":"...","description":"...","duration_sec":4}}, ...]}}

Hard constraints (MUST follow):
- Scene count must be exactly {sc}.
- Main character MUST be "{req.character.name}" in every scene.
- Do NOT introduce any new named characters (no barista, friend, etc.).
- Setting MUST stay "{req.brief.where}" only (no alley, street, other places).
- Actions MUST match this core action: "{anchor}".
- No story, no mystery, no narration, no metaphors, no dramatic tone.
- Each description must be ONE short sentence (<= 40 Korean characters if ko, otherwise <= 120 chars).
- Each description must describe only what is visible on screen (camera view + action + key objects).
- duration_sec should be a small integer 3~6.

Styling guide:
- Think of 3 cuts: (1) establishing shot, (2) action/detail shot, (3) closing shot.
- Titles must be plain and functional (e.g., "카페 전경", "노트북 작업", "커피 한 모금").

Character:
- name: {req.character.name}
- image_url: {req.character.image_url}

Brief:
- who: {req.brief.who}
- where: {req.brief.where}
- what: {req.brief.what}
- how: {req.brief.how}
""".strip()

def _build_regen_prompt(req: RegenerateScenarioRequest) -> str:
    sc = req.options.scene_count
    lang = req.options.lang

    # 사용자가 준 수정사항을 강제 반영
    edits = "\n".join([f"- scene_id={s.id}: {s.description}" for s in req.scenes])

    return f"""
You create simple, realistic storyboard scenes for a short video.
Language: {lang}

OUTPUT MUST BE VALID JSON ONLY with this schema:
{{"scenes":[{{"id":1,"title":"...","description":"...","duration_sec":4}}, ...]}}

Hard constraints (MUST follow):
- Scene count must be exactly {sc}.
- Do NOT introduce any new named characters.
- Use the same main character implied by the edits and reference image.
- Setting stays consistent (do not add new places unless explicitly in edits).
- No story, no mystery, no narration, no metaphors, no dramatic tone.
- Each description must be ONE short sentence (<= 25 Korean characters if ko, otherwise <= 120 chars).
- Each description must describe only what is visible on screen (camera view + action + key objects).
- duration_sec should be a small integer 3~6.
- You MUST apply the user edits below:
  If an edit references scene_id=k, the output scene with id=k must reflect that edit closely.

Reference image (character):
- {req.character_image_url}

User edits:
{edits}

Styling guide:
- 3 cuts: (1) establishing, (2) action/detail, (3) closing.
- Titles must be plain and functional.
""".strip()

def create_scenario(req: CreateScenarioRequest) -> CreateScenarioResponse:
    prompt = _build_create_prompt(req)
    data = generate_scenes_json(prompt)

    # data: {"scenes":[...]} 구조는 generate_scenes_json에서 이미 검증됨(ScenesLLM)
    scenes_out: list[SceneOut] = [
        SceneOut(
            id=s["id"],
            title=s["title"],
            description=s["description"],
            duration_sec=s["duration_sec"],
            image_url=None,
        )
        for s in data["scenes"]
    ]

    scenario_id = str(uuid4())
    payload = {
        "scenario_id": scenario_id,
        "request": req.model_dump(mode="json"),
        "scenes": [s.model_dump(mode="json") for s in scenes_out],
    }

    try:
        _scenario_path(scenario_id).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to save scenario: {str(e)}", status_code=500)

    return CreateScenarioResponse(scenario_id=scenario_id, scenes=scenes_out)


def get_scenario(scenario_id: str) -> CreateScenarioResponse:
    p = _scenario_path(scenario_id)
    if not p.exists():
        raise AppError("NOT_FOUND", f"Scenario not found: {scenario_id}", status_code=404)

    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
        return CreateScenarioResponse.model_validate(
            {"scenario_id": payload["scenario_id"], "scenes": payload["scenes"]}
        )
    except AppError:
        raise
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to load scenario: {str(e)}", status_code=500)


def list_scenarios(limit: int = 20, offset: int = 0) -> list[CreateScenarioResponse]:
    d = _ensure_dir()
    files = sorted(d.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True)

    sliced = files[offset : offset + limit]
    items: List[CreateScenarioResponse] = []
    for f in sliced:
        try:
            payload = json.loads(f.read_text(encoding="utf-8"))
            items.append(
                CreateScenarioResponse.model_validate(
                    {"scenario_id": payload["scenario_id"], "scenes": payload["scenes"]}
                )
            )
        except Exception:
            # 파일 하나 깨져도 리스트 전체는 유지
            continue
    return items


def regenerate_scenario(req: RegenerateScenarioRequest) -> RegenerateScenarioResponse:
    prompt = _build_regen_prompt(req)
    data = generate_scenes_json(prompt)

    scenes_out: list[SceneOut] = [
        SceneOut(
            id=s["id"],
            title=s["title"],
            description=s["description"],
            duration_sec=s["duration_sec"],
            image_url=None,
        )
        for s in data["scenes"]
    ]

    scenario_id = str(uuid4())
    payload = {
        "scenario_id": scenario_id,
        "request": req.model_dump(mode="json"),
        "scenes": [s.model_dump(mode="json") for s in scenes_out],
    }

    try:
        _scenario_path(scenario_id).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to save scenario: {str(e)}", status_code=500)

    return RegenerateScenarioResponse(scenario_id=scenario_id, scenes=scenes_out)
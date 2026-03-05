from __future__ import annotations

import json
from uuid import uuid4
from pathlib import Path
from typing import Optional, List
import boto3

from app.core.config import settings
from app.core.errors import AppError
from app.schemas.scenario import (
    CreateScenarioRequest,
    CreateScenarioResponse,
    RegenerateScenarioRequest,
    RegenerateScenarioResponse,
    SceneOut,
)
from app.services.character_analyzer import extract_character_description_and_scenes
from app.services.s3_service import upload_scenario_to_s3


def _ensure_dir() -> Path:
    d = Path(settings.scenarios_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _scenario_path(scenario_id: str) -> Path:
    d = _ensure_dir()
    return d / f"{scenario_id}.json"


def _normalize_scene_duration(scene: dict) -> dict:
    # Backward compatibility for already-stored payloads using duration_sec.
    if "duration" in scene:
        return scene
    if "duration_sec" in scene:
        normalized = dict(scene)
        normalized["duration"] = normalized.pop("duration_sec")
        return normalized
    return scene

def _build_regen_prompt(req: RegenerateScenarioRequest) -> str:
    sc = req.options.scene_count
    lang = req.options.lang

    edits = "\n".join([f"- scene_id={s.id}: {s.description}" for s in req.scenes])

    return f"""
You create simple, realistic storyboard scenes for a short video.
Language: {lang}

OUTPUT MUST BE VALID JSON ONLY with this schema:
{{
  "scenes":[
    {{
      "id":1,
      "title":"...",
      "description":"...",
      "duration":4,
      "image_prompt":"...",
      "video_prompt":"..."
    }},
    ...
  ]
}}

Field rules (MUST follow):
- description: storyboard caption for humans (ONE short sentence).
  - Must describe only what is visible on screen (camera view + action + key objects).
  - NO camera specs, NO lighting specs, NO style keywords, NO prompt-like wording.
- image_prompt: image-generation prompt for a model like Stable Diffusion/ComfyUI.
  - Include shot/composition, camera angle, lighting, style, background, key props.
  - Must reflect the final description accurately.
  - Do NOT add new characters.
  - Keep it concise but usable (<= 300 chars).
  - image_prompt must be written in English. Use comma-separated prompt keywords.
- video_prompt: Write as a single flowing paragraph in present tense.
  Must include in this order:
    1. Shot type (e.g. medium shot, close-up, wide establishing shot)
    2. Character action — use motion verbs, physical gestures only. NO abstract emotions.
    3. Camera movement (e.g. slow tracking shot follows from behind, camera pushes in)
    4. Environment & lighting (e.g. sunlit forest path, warm golden hour, falling leaves)
    5. Mood/style keywords (e.g. kawaii animation style, soft warm tones, whimsical)
  Target length: 4–6 sentences (~150–300 words). Do NOT compress into one sentence.
  
  EMOTION RULES - NEVER use abstract emotion words:
  ❌ "walks happily" → ✅ "walks with a slight bounce in each step, head tilting side to side"
  ❌ "looks curious" → ✅ "tilts head slowly to one side, eyes wide, leaning slightly forward"
  
  CHARACTER CONSISTENCY:
  - Use short character identifier in every video_prompt: "a small blue star-shaped plush character with a white face and yellow S emblem"
  - Character appearance must be identical in every scene.
  
  SCENE CONTINUITY:
  - Scenes must feel like continuous cuts from the same video.
  - Environment and lighting must remain consistent across all scenes unless explicitly changed.
  - For scene 2 and beyond, reference where the previous scene ended.
    Example: "Continuing from the forest path, the character now approaches a wooden bridge..."

Hard constraints (MUST follow):
- Scene count must be exactly {sc}.
- Do NOT introduce any new named characters.
- Use the same main character implied by the edits and reference image.
- Setting stays consistent (do not add new places unless explicitly in edits).
- No story, no mystery, no narration, no metaphors, no dramatic tone.
- description length: <= 40 Korean characters if ko, otherwise <= 120 chars.
- duration should be a small integer 3~6.
- You MUST apply the user edits below:
  If an edit references scene_id=k, the output scene with id=k must reflect that edit closely.

Reference image (character):
- {req.character_image_url}

User edits:
{edits}

Shot plan guide:
- 3 cuts: (1) establishing, (2) action/detail, (3) closing.
- Titles must be plain and functional.

Video prompt template (follow this exact structure):
"[SHOT TYPE], [CHARACTER_ID] [ACTION with physical detail].
The camera [CAMERA MOVEMENT] as [WHAT HAPPENS NEXT].
[ENVIRONMENT description: location, time, atmosphere].
[LIGHTING: quality, color, direction].
[STYLE: animation style, mood keywords, texture]."

Example video_prompt:
"Medium shot, a small blue star-shaped plush character with a white face bounces forward along a sunlit dirt path, arms swaying gently with each step. The camera tracks slowly from behind, following at eye level as golden leaves drift down around the character. Warm afternoon light filters through tall trees, casting soft dappled shadows on the path. Kawaii 3D animation style, soft warm tones, whimsical and gentle."
""".strip()

def generate_scenes_json(prompt: str) -> dict:
    """LLM을 사용해서 씬 JSON 생성"""
    try:
        bedrock = boto3.client('bedrock-runtime', region_name=settings.aws_region)
        model_id = "apac.anthropic.claude-3-5-sonnet-20241022-v2:0"
        
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }
        
        response = bedrock.invoke_model(
            modelId=model_id,
            body=json.dumps(body)
        )
        
        response_body = json.loads(response['body'].read())
        raw_text = response_body['content'][0]['text']
        
        return json.loads(raw_text)
        
    except Exception as e:
        raise AppError("UPSTREAM_ERROR", f"LLM call failed: {str(e)}", status_code=502)

def create_scenario(req: CreateScenarioRequest) -> CreateScenarioResponse:
    print(f"\n=== Sonnet으로 캐릭터 분석 + 씬 생성 (통합) ===")
    
    # base64 데이터에서 헤더 제거
    image_data = req.character.image_url
    if image_data.startswith('data:image'):
        image_data = image_data.split(',')[1]
    
    # Sonnet으로 한 번에 처리
    data = extract_character_description_and_scenes(image_data, req)
    
    # 시나리오 ID 미리 생성
    scenario_id = str(uuid4())

    # 씬 데이터 처리
    scenes_out: list[SceneOut] = []
    
    for s in data["scenes"]:
        print(f"씬 {s['scene_number']} 생성 완료")
        
        scene_out = SceneOut(
            id=s["scene_number"],
            title=f"씬 {s['scene_number']}",  # 기본 제목
            description=s["scenario_ko"],
            duration=4,  # 기본 4초
            image_prompt="",
            video_prompt=s["video_prompt_en"],
            image_url=None,
        )
        scenes_out.append(scene_out)

    payload = {
        "scenario_id": scenario_id,
        "request": req.model_dump(mode="json"),
        "scenes": [s.model_dump(mode="json") for s in scenes_out],
    }

    try:
        # 로컬 파일 저장
        _scenario_path(scenario_id).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        
        # S3에 시나리오 데이터 업로드
        upload_scenario_to_s3(scenario_id, payload)
        
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to save scenario: {str(e)}", status_code=500)

    return CreateScenarioResponse(scenario_id=scenario_id, scenes=scenes_out)


def get_scenario(scenario_id: str) -> CreateScenarioResponse:
    p = _scenario_path(scenario_id)
    if not p.exists():
        raise AppError("NOT_FOUND", f"Scenario not found: {scenario_id}", status_code=404)

    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
        scenes = [_normalize_scene_duration(s) for s in payload["scenes"]]
        return CreateScenarioResponse.model_validate(
            {"scenario_id": payload["scenario_id"], "scenes": scenes}
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
            scenes = [_normalize_scene_duration(s) for s in payload["scenes"]]
            items.append(
                CreateScenarioResponse.model_validate(
                    {"scenario_id": payload["scenario_id"], "scenes": scenes}
                )
            )
        except Exception:
            # 파일 하나 깨져도 리스트 전체는 유지
            continue
    return items


def regenerate_scenario(scenario_id: str, req: RegenerateScenarioRequest) -> RegenerateScenarioResponse:
    prompt = _build_regen_prompt(req)
    data = generate_scenes_json(prompt)

    scenes_out: list[SceneOut] = [
        SceneOut(
            id=s["id"],
            title=s["title"],
            description=s["description"],
            duration=s["duration"],
            image_prompt=s["image_prompt"],
            video_prompt=s["video_prompt"],
            image_url=None,
        )
        for s in data["scenes"]
    ]
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

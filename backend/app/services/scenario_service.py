from __future__ import annotations

import json
from uuid import uuid4
from pathlib import Path
from typing import Optional, List
import boto3
from datetime import datetime

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
from app.services.s3_service import upload_scenario_to_s3, upload_character_image_to_s3


def _ensure_dir() -> Path:
    d = Path(settings.scenarios_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _scenario_path(scenario_id: str) -> Path:
    d = _ensure_dir()
    # 새로운 구조: scenarios/{scenario_id}/metadata.json
    scenario_dir = d / scenario_id
    metadata_path = scenario_dir / "metadata.json"
    
    # 새로운 구조가 있으면 사용
    if metadata_path.exists():
        return metadata_path
    
    # 기존 구조 fallback: scenarios/{scenario_id}.json
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


def _normalize_scene_media(scene: dict) -> dict:
    normalized = dict(scene)

    # Older payloads stored the rendered video URL in image_url.
    if (
        not normalized.get("video_url")
        and isinstance(normalized.get("image_url"), str)
        and normalized["image_url"].lower().endswith(".mp4")
    ):
        normalized["video_url"] = normalized["image_url"]
        normalized["image_url"] = None

    # Remove any extra fields that are not part of SceneOut model
    allowed_fields = {"id", "title", "description", "duration", "image_prompt", "video_prompt", "image_url", "video_url"}
    normalized = {k: v for k, v in normalized.items() if k in allowed_fields}
    
    # Ensure video_url is properly handled
    if "video_url" not in normalized:
        normalized["video_url"] = None
    
    # 디버깅: image_url 정규화 과정 확인
    if "image_url" in scene:
        print(f"_normalize_scene_media - Scene {scene.get('id', 'unknown')}: original image_url = {scene['image_url']}")
        print(f"_normalize_scene_media - Scene {scene.get('id', 'unknown')}: normalized image_url = {normalized.get('image_url', 'None')}")
    
    return normalized


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat()

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
  - Use short character identifier in every video_prompt.
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

def _mock_regen_scenes() -> dict:
    return {
        "scenes": [
            {
                "id": 1,
                "title": "Scene 1",
                "description": "고양이가 풀밭 가장자리에서 몸을 낮추고 나비를 발견한다.",
                "duration": 4,
                "image_prompt": "A cute cat crouching in the grass, spotting a butterfly, cinematic composition, soft sunlight, 3D animation style",
                "video_prompt": "A cute 3D animated cat crouches low in the grass and notices a butterfly, then lifts its head with bright curious eyes as the camera slowly pushes in, soft sunlight and a gentle breeze moving through the field, cinematic and lively mood."
            },
            {
                "id": 2,
                "title": "Scene 2",
                "description": "고양이가 나비를 향해 빠르게 뛰어가며 장난스럽게 움직인다.",
                "duration": 4,
                "image_prompt": "A playful cat running after a butterfly in a green meadow, dynamic motion, cinematic shot, 3D animation style",
                "video_prompt": "A cute 3D animated cat dashes across the meadow chasing a butterfly, paws bouncing lightly and tail swinging with excitement as the camera tracks alongside, vivid outdoor light, energetic movement, playful cinematic feeling."
            },
            {
                "id": 3,
                "title": "Scene 3",
                "description": "고양이가 풀밭을 신나게 뛰어다니다가 만족스러운 표정으로 멈춘다.",
                "duration": 4,
                "image_prompt": "A cheerful cat happily playing in a grassy field, final cinematic shot, soft golden light, 3D animation style",
                "video_prompt": "A cute 3D animated cat keeps running happily through the grassy field, then slows down and stops with a satisfied expression, breathing lightly as the camera settles into a warm final shot, soft golden light and polished cinematic 3D animation mood."
            }
        ]
    }

def generate_scenes_json(prompt: str) -> dict:
    """LLM을 사용해서 씬 JSON 생성"""
    use_mock_llm = getattr(settings, "use_mock_llm", False)
    allow_mock_fallback = getattr(settings, "allow_mock_fallback", False)
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
        print(f"[ERROR] regenerate LLM call failed: {e}")

        if allow_mock_fallback:
            print("[MOCK] ALLOW_MOCK_FALLBACK=true → regenerate용 mock scenes 반환")
            return _mock_regen_scenes()

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
    
    # 캐릭터 이미지 S3 업로드
    upload_character_image_to_s3(image_data, scenario_id)

    # 씬 데이터 처리 - 연속성을 위한 메타데이터 추가
    scenes_out: list[SceneOut] = []
    
    for s in data["scenes"]:
        print(f"씬 {s['scene_number']} 생성 완료")
        
        # 첫 번째 씬은 원본 캐릭터 이미지, 이후는 이전 씬의 last_frame 사용 예정
        
        scene_out = SceneOut(
            id=s["scene_number"],
            title=f"씬 {s['scene_number']}",
            description=s["scenario_ko"],
            duration=4,
            image_prompt=s.get("image_prompt_en", s["scenario_ko"]),  # 이미지 프롬프트 활용
            video_prompt=s["video_prompt_en"],
            image_url=None,  # 생성 후 업데이트됨
        )
        scenes_out.append(scene_out)

    now = _now_iso()
    payload = {
        "scenario_id": scenario_id,
        "created_at": now,
        "updated_at": now,
        "request": req.model_dump(mode="json"),
        "scenes": [s.model_dump(mode="json") for s in scenes_out],
        "character_description": data.get("character_description", ""),  # 연속성을 위한 캐릭터 설명 저장
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

    return CreateScenarioResponse(
        scenario_id=scenario_id,
        created_at=payload["created_at"],
        updated_at=payload["updated_at"],
        scenes=scenes_out,
    )


def get_scene_for_generation(scenario_id: str, scene_id: int) -> dict:
    """ComfyUI 생성을 위한 특정 씬 정보 반환 (S3에서 직접 로드)"""
    try:
        # S3에서 직접 로드
        import requests
        s3_url = f"https://comfyui-ml-v2-videos-c8f7625e.s3.ap-northeast-2.amazonaws.com/scenarios/{scenario_id}/metadata.json"
        
        print(f"\n=== get_scene_for_generation S3 로드 ===")
        print(f"S3 URL: {s3_url}")
        
        response = requests.get(s3_url, timeout=10)
        if response.status_code != 200:
            print(f"S3 로드 실패: {response.status_code}")
            raise AppError("NOT_FOUND", f"Scenario not found in S3: {scenario_id}", status_code=404)
        
        payload = response.json()
        scenes = payload.get("scenes", [])
        
        scene_data = None
        for s in scenes:
            if s.get("id") == scene_id:
                scene_data = s
                break
        
        if not scene_data:
            raise AppError("NOT_FOUND", f"Scene {scene_id} not found", status_code=404)
        
        print(f"Scene {scene_id} 데이터:")
        print(f"  - image_url: {scene_data.get('image_url')}")
        print(f"  - video_url: {scene_data.get('video_url')}")
        
        image_url = scene_data.get('image_url')
        input_image = image_url if image_url and image_url.strip() else "input.png"
        
        print(f"최종 input_image: {input_image}")
        print(f"=== S3 로드 완료 ===\n")
        
        return {
            "scene_id": scene_id,
            "video_prompt": scene_data.get("video_prompt", ""),
            "duration": scene_data.get("duration", 4),
            "input_image": input_image
        }
        
    except AppError:
        raise
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        print(traceback.format_exc())
        raise AppError("STORAGE_ERROR", f"Failed to load from S3: {str(e)}", status_code=500)


def update_scene_image_url(scenario_id: str, scene_id: int, image_url: str) -> None:
    """씬 프리뷰 이미지 생성 완료 후 image_url 업데이트"""
    p = _scenario_path(scenario_id)
    if not p.exists():
        print(f"Scenario file not found: {p}")
        raise AppError("NOT_FOUND", f"Scenario not found: {scenario_id}", status_code=404)
    
    try:
        print(f"\n=== update_scene_image_url 시작 ===")
        print(f"Scenario ID: {scenario_id}, Scene ID: {scene_id}")
        print(f"New image URL: {image_url}")
        print(f"Reading scenario file: {p}")
        
        payload = json.loads(p.read_text(encoding="utf-8"))
        print(f"Loaded scenario with {len(payload.get('scenes', []))} scenes")
        
        # 업데이트 전 씬 상태 확인
        for scene in payload["scenes"]:
            if scene["id"] == scene_id:
                print(f"업데이트 전 씬 {scene_id} image_url: {scene.get('image_url', 'None')}")
                break
        
        # 해당 씬 찾아서 image_url 업데이트
        scene_found = False
        for scene in payload["scenes"]:
            if scene["id"] == scene_id:
                print(f"Updating scene {scene_id} with image URL: {image_url}")
                scene["image_url"] = image_url
                scene_found = True
                print(f"업데이트 후 씬 {scene_id} image_url: {scene['image_url']}")
                break
        
        if not scene_found:
            print(f"Scene {scene_id} not found in scenario {scenario_id}")
            raise AppError("NOT_FOUND", f"Scene {scene_id} not found", status_code=404)
        
        payload["updated_at"] = _now_iso()

        # 파일 저장
        print(f"Saving updated scenario to: {p}")
        p.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        
        # 저장 후 검증
        verification_payload = json.loads(p.read_text(encoding="utf-8"))
        for scene in verification_payload["scenes"]:
            if scene["id"] == scene_id:
                print(f"파일 저장 후 검증 - 씬 {scene_id} image_url: {scene.get('image_url', 'None')}")
                break
        
        # S3 업데이트
        print(f"Uploading scenario to S3")
        upload_scenario_to_s3(scenario_id, payload)
        print(f"Scene {scene_id} image_url update completed successfully")
        print(f"=== update_scene_image_url 완료 ===\n")
        
    except AppError:
        raise
    except Exception as e:
        print(f"Error updating scene image_url: {e}")
        import traceback
        print(traceback.format_exc())
        raise AppError("STORAGE_ERROR", f"Failed to update scene image_url: {str(e)}", status_code=500)

def update_scene_result(scenario_id: str, scene_id: int, video_url: str, last_frame_filename: str = "") -> None:
    """씬 생성 완료 후 결과 업데이트"""
    p = _scenario_path(scenario_id)
    if not p.exists():
        print(f"Scenario file not found: {p}")
        raise AppError("NOT_FOUND", f"Scenario not found: {scenario_id}", status_code=404)
    
    try:
        print(f"\n=== update_scene_result 시작 ===")
        print(f"Scenario ID: {scenario_id}, Scene ID: {scene_id}")
        print(f"Video URL: {video_url}")
        print(f"Reading scenario file: {p}")
        
        payload = json.loads(p.read_text(encoding="utf-8"))
        print(f"Loaded scenario with {len(payload.get('scenes', []))} scenes")
        
        # 업데이트 전 씬 상태 확인
        for scene in payload["scenes"]:
            if scene["id"] == scene_id:
                print(f"업데이트 전 씬 {scene_id}:")
                print(f"  - image_url: {scene.get('image_url', 'None')}")
                print(f"  - video_url: {scene.get('video_url', 'None')}")
                break
        
        # 해당 씬 찾아서 업데이트
        scene_found = False
        for scene in payload["scenes"]:
            if scene["id"] == scene_id:
                print(f"Updating scene {scene_id} with video URL: {video_url}")
                # 중요: video_url에 저장 (image_url 덤어쓰지 않음)
                scene["video_url"] = video_url
                if last_frame_filename:
                    scene["last_frame_filename"] = last_frame_filename
                scene_found = True
                print(f"업데이트 후 씬 {scene_id}:")
                print(f"  - image_url: {scene.get('image_url', 'None')} (변경되지 않음)")
                print(f"  - video_url: {scene.get('video_url', 'None')} (새로 설정)")
                break
        
        if not scene_found:
            print(f"Scene {scene_id} not found in scenario {scenario_id}")
            raise AppError("NOT_FOUND", f"Scene {scene_id} not found", status_code=404)
        
        payload["updated_at"] = _now_iso()

        # 파일 저장
        print(f"Saving updated scenario to: {p}")
        p.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        
        # 저장 후 검증
        verification_payload = json.loads(p.read_text(encoding="utf-8"))
        for scene in verification_payload["scenes"]:
            if scene["id"] == scene_id:
                print(f"파일 저장 후 검증 - 씬 {scene_id}:")
                print(f"  - image_url: {scene.get('image_url', 'None')}")
                print(f"  - video_url: {scene.get('video_url', 'None')}")
                break
        
        # S3 업데이트
        print(f"Uploading scenario to S3")
        upload_scenario_to_s3(scenario_id, payload)
        print(f"Scene {scene_id} video_url update completed successfully")
        print(f"=== update_scene_result 완료 ===\n")
        
    except AppError:
        raise
    except Exception as e:
        print(f"Error updating scene result: {e}")
        import traceback
        print(traceback.format_exc())
        raise AppError("STORAGE_ERROR", f"Failed to update scene result: {str(e)}", status_code=500)

def get_scenario(scenario_id: str) -> CreateScenarioResponse:
    # 먼저 로컬 파일 확인
    p = _scenario_path(scenario_id)
    
    if p.exists():
        try:
            payload = json.loads(p.read_text(encoding="utf-8"))
            scenes = [_normalize_scene_media(_normalize_scene_duration(s)) for s in payload["scenes"]]
            return CreateScenarioResponse.model_validate(
                {
                    "scenario_id": payload["scenario_id"],
                    "created_at": payload.get("created_at"),
                    "updated_at": payload.get("updated_at"),
                    "scenes": scenes,
                }
            )
        except Exception as e:
            print(f"Failed to load local scenario file: {e}")
    
    # 로컬에 없으면 S3에서 가져오기
    try:
        import requests
        
        # 여러 가능한 S3 URL 시도 (브라우저에서 작동하는 URL 우선)
        base_url = f"https://{settings.s3_bucket_name}.s3.{settings.s3_region}.amazonaws.com"
        possible_paths = [
            f"scenarios/{scenario_id}/metadata.json",  # 브라우저에서 작동하는 경로
            f"scenarios/{scenario_id}.json", 
            f"{scenario_id}/metadata.json",
            f"{scenario_id}.json",
            f"scenarios/{scenario_id}/scenario.json"
        ]
        
        payload = None
        successful_url = None
        
        for path in possible_paths:
            s3_url = f"{base_url}/{path}"
            print(f"S3 URL 시도: {s3_url}")
            
            try:
                response = requests.get(s3_url, timeout=10)
                print(f"  -> HTTP {response.status_code}: {response.reason}")
                print(f"  -> Headers: {dict(response.headers)}")
                
                if response.status_code == 200:
                    try:
                        payload = response.json()
                        successful_url = s3_url
                        print(f"S3에서 시나리오 성공적으로 로드: {s3_url}")
                        break
                    except json.JSONDecodeError as je:
                        print(f"  -> JSON 파싱 에러: {je}")
                        print(f"  -> Response content: {response.text[:200]}...")
                        continue
                else:
                    print(f"  -> Response content: {response.text[:100]}")
                    
            except requests.exceptions.RequestException as e:
                print(f"  -> 요청 에러: {e}")
                continue
            except Exception as e:
                print(f"  -> 예상치 못한 에러: {type(e).__name__}: {e}")
                continue
        
        if not payload:
            print(f"\n모든 경로에서 시나리오를 찾을 수 없음.")
            print(f"시도한 경로들:")
            for path in possible_paths:
                print(f"  - {base_url}/{path}")
            raise Exception(f"Scenario not found in S3: {scenario_id}")
        
        # 로컬에도 저장 (캐싱)
        if payload:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            print(f"S3에서 로드한 시나리오를 로컬에 캐싱")
        
        scenes = [_normalize_scene_media(_normalize_scene_duration(s)) for s in payload["scenes"]]
        
        # Debug: 정규화된 씬 데이터 출력
        print(f"정규화된 씬 데이터 (첫 번째 씬): {scenes[0] if scenes else 'No scenes'}")
        
        return CreateScenarioResponse.model_validate(
            {
                "scenario_id": payload["scenario_id"],
                "created_at": payload.get("created_at"),
                "updated_at": payload.get("updated_at"),
                "scenes": scenes,
            }
        )
        
    except Exception as e:
        print(f"Failed to load scenario from S3: {e}")
        raise AppError("NOT_FOUND", f"Scenario not found: {scenario_id}", status_code=404)


def list_scenarios(limit: int = 20, offset: int = 0) -> list[CreateScenarioResponse]:
    d = _ensure_dir()
    files = sorted(d.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True)

    sliced = files[offset : offset + limit]
    items: List[CreateScenarioResponse] = []
    for f in sliced:
        try:
            payload = json.loads(f.read_text(encoding="utf-8"))
            scenes = [_normalize_scene_media(_normalize_scene_duration(s)) for s in payload["scenes"]]
            items.append(
                CreateScenarioResponse.model_validate(
                    {
                        "scenario_id": payload["scenario_id"],
                        "created_at": payload.get("created_at"),
                        "updated_at": payload.get("updated_at"),
                        "scenes": scenes,
                    }
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
            video_url=None,
        )
        for s in data["scenes"]
    ]
    existing_created_at = None
    scenario_path = _scenario_path(scenario_id)
    if scenario_path.exists():
        try:
            existing_payload = json.loads(scenario_path.read_text(encoding="utf-8"))
            existing_created_at = existing_payload.get("created_at")
        except Exception:
            existing_created_at = None

    now = _now_iso()
    payload = {
        "scenario_id": scenario_id,
        "created_at": existing_created_at or now,
        "updated_at": now,
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

    return RegenerateScenarioResponse(
        scenario_id=scenario_id,
        created_at=payload["created_at"],
        updated_at=payload["updated_at"],
        scenes=scenes_out,
    )
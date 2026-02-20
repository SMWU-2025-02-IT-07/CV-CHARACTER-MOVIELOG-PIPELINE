from app.core.errors import AppError
from app.schemas.scenario import SceneOut, BriefIn

def build_prompt_for_create(name: str, image_url: str, brief: BriefIn, scene_count: int, lang: str) -> str:
    return f"""
You are an assistant that writes short 3-scene storyboards for a character video.
Return ONLY valid JSON matching this schema exactly:
{{
  "scenes": [
    {{"id":1,"title":"Scene 1","description":"...","duration_sec":4}},
    {{"id":2,"title":"Scene 2","description":"...","duration_sec":4}},
    {{"id":3,"title":"Scene 3","description":"...","duration_sec":4}}
  ]
}}

Rules:
- scenes length MUST be {scene_count}
- ids MUST be 1..{scene_count}
- language: {lang} (Korean if 'ko')
- description should be 1 sentence, clear action and place
- Keep each scene coherent with brief
- Do not mention JSON rules in output

Character:
- name: {name}
- reference image url: {image_url}

Brief:
- who: {brief.who}
- where: {brief.where}
- what: {brief.what}
- how: {brief.how}
""".strip()

def validate_and_normalize_scenes(payload: dict, scene_count: int) -> list[SceneOut]:
    if "scenes" not in payload or not isinstance(payload["scenes"], list):
        raise AppError("UPSTREAM_ERROR", "LLM returned invalid JSON: missing scenes", status_code=502)

    scenes = payload["scenes"]
    if len(scenes) != scene_count:
        raise AppError("UPSTREAM_ERROR", f"LLM returned {len(scenes)} scenes, expected {scene_count}", status_code=502)

    out: list[SceneOut] = []
    for i, s in enumerate(scenes, start=1):
        if not isinstance(s, dict):
            raise AppError("UPSTREAM_ERROR", "LLM returned invalid scene type", status_code=502)
        if s.get("id") != i:
            raise AppError("UPSTREAM_ERROR", "LLM returned invalid scene id sequence", status_code=502)
        title = s.get("title") or f"Scene {i}"
        desc = s.get("description")
        dur = s.get("duration_sec")
        if not isinstance(desc, str) or not desc.strip():
            raise AppError("UPSTREAM_ERROR", "LLM returned empty description", status_code=502)
        if not isinstance(dur, int) or dur <= 0:
            raise AppError("UPSTREAM_ERROR", "LLM returned invalid duration_sec", status_code=502)

        out.append(SceneOut(id=i, title=title, description=desc.strip(), duration_sec=dur, image_url=None))

    return out

def build_prompt_for_regenerate(scenes: list[dict], character_image_url: str, lang: str) -> str:
    return f"""
Return ONLY valid JSON:
{{"scenes":[{{"id":1,"title":"Scene 1","description":"...","duration_sec":4}}, ...]}}

Rules:
- Keep same number of scenes and same ids
- language: {lang}
- Keep character consistent with reference image url: {character_image_url}
- Improve clarity and cinematic flow, but do not add new characters
- Output must be JSON only

Current scenes (user-edited):
{scenes}
""".strip()
import json
from openai import OpenAI
from app.core.config import settings
from app.core.errors import AppError
from app.schemas.scenario import ScenesLLM

client = OpenAI(api_key=settings.openai_api_key)

def generate_scenes_json(prompt: str, model: str | None = None) -> dict:
    """
    Returns dict like: {"scenes":[{"id":1,"title":"...","description":"...","duration":4}, ...]}
    """
    try:
        res = client.chat.completions.create(
            model=model or settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "scenario_scenes",
                    "schema": ScenesLLM.model_json_schema(),
                    "strict": True,
                }
            },
        )

        raw = res.choices[0].message.content
        parsed = json.loads(raw)

        # 서버에서 한 번 더 Pydantic 검증
        ScenesLLM.model_validate(parsed)

        return parsed

    except Exception as e:
        raise AppError("UPSTREAM_ERROR", f"OpenAI call failed: {str(e)}", status_code=502)
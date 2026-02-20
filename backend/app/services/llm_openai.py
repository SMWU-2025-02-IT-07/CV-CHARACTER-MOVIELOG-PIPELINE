from openai import OpenAI
from app.core.config import settings
from app.core.errors import AppError

client = OpenAI(api_key=settings.openai_api_key)

def generate_scenes_json(prompt: str, model: str | None = None) -> dict:
    """
    Returns dict like: {"scenes":[{"id":1,"title":"...","description":"...","duration_sec":4}, ...]}
    """
    try:
        res = client.responses.create(
            model=model or settings.openai_model,
            instructions="You generate structured JSON only. Do not include any extra text.",
            input=prompt,
        )
        # res.output_text is documented convenience accessor for text output. :contentReference[oaicite:3]{index=3}
        text = res.output_text
        import json
        return json.loads(text)
    except Exception as e:
        # 모델이 JSON이 아닌 걸 뱉거나 API 실패하는 케이스 모두 upstream으로 처리
        raise AppError("UPSTREAM_ERROR", f"LLM call failed: {str(e)}", status_code=502)
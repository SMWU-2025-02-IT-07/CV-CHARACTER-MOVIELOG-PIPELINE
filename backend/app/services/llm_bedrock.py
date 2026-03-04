import json
import boto3
from app.core.config import settings
from app.core.errors import AppError
from app.schemas.scenario import ScenesLLM

bedrock = boto3.client('bedrock-runtime', region_name='ap-northeast-2')

def generate_scenes_json(prompt: str, model: str | None = None) -> dict:
    """
    Returns dict like: {"scenes":[{"id":1,"title":"...","description":"...","duration":4}, ...]}
    """
    try:
        model_id = model or "apac.anthropic.claude-3-haiku-20240307-v1:0"
        
        # Claude 메시지 형식
        messages = [{
            "role": "user",
            "content": f"""Generate a JSON response for the following prompt: {prompt}

Return only valid JSON in this exact format:
{json.dumps(ScenesLLM.model_json_schema()["properties"], indent=2)}

Make sure the response is valid JSON with no additional text."""
        }]
        
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "messages": messages,
            "temperature": 0.7
        }
        
        response = bedrock.invoke_model(
            modelId=model_id,
            body=json.dumps(body)
        )
        
        response_body = json.loads(response['body'].read())
        raw_text = response_body['content'][0]['text']
        
        # JSON 파싱
        parsed = json.loads(raw_text)
        
        # Pydantic 검증
        ScenesLLM.model_validate(parsed)
        
        return parsed
        
    except Exception as e:
        raise AppError("UPSTREAM_ERROR", f"Bedrock call failed: {str(e)}", status_code=502)
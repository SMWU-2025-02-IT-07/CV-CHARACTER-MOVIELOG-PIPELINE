import json
import base64
import boto3
from app.core.config import settings
from app.core.errors import AppError
from app.schemas.scenario import ScenesLLM, CreateScenarioRequest

bedrock = boto3.client('bedrock-runtime', region_name=settings.aws_region)

def extract_character_description_and_scenes(image_base64: str, req: CreateScenarioRequest) -> dict:
    """
    Sonnet을 사용해서 캐릭터 분석 + 씬 생성을 한 번에 처리
    
    Args:
        image_base64: 캐릭터 이미지 base64
        req: 시나리오 요청 데이터
    
    Returns:
        {"character_description": "...", "scenes": [...]} 형태의 데이터
    """
    try:
        model_id = "apac.anthropic.claude-3-5-sonnet-20241022-v2:0"
        
        # 상황 텍스트 생성
        situation = f"{req.character.name}는 {req.brief.where}에서 {req.brief.what} {req.brief.how}"
        
        messages = [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_base64
                    }
                },
                {
                    "type": "text",
                    "text": f"""Character: [이미지 첨부]
Situation: {situation}
Art style: 3D animation"""
                }
            ]
        }]
        
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "messages": messages,
            "temperature": 0.7,
            "system": """You are a video director specializing in LTX-2 AI video generation.

Given a character description and a situation, generate exactly 3 connected scenes.

Rules:
- Scenes must flow naturally as a continuous story
- CHARACTER DESCRIPTION must be repeated verbatim at the start of every video_prompt_en
- Express emotion through posture, gesture, facial expression — never abstract labels
- video_prompt_en must start with a motion verb
- Write video_prompt_en as a single flowing paragraph, present tense

Output strict JSON only, no markdown, no explanation:
{
  "character_description": "Fixed English description of character appearance. Used as prefix in all scenes.",
  "scenes": [
    {
      "scene_number": 1,
      "scenario_ko": "한국어 시나리오 2-3문장. 생동감 있게.",
      "video_prompt_en": "{character_description} + action, camera movement, environment, lighting, mood/style."
    },
    {
      "scene_number": 2,
      "scenario_ko": "...",
      "video_prompt_en": "..."
    },
    {
      "scene_number": 3,
      "scenario_ko": "...",
      "video_prompt_en": "..."
    }
  ]
}"""
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
        raise AppError("UPSTREAM_ERROR", f"Sonnet call failed: {str(e)}", status_code=502)
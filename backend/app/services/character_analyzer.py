import json
import base64
import boto3
from PIL import Image
import io
from app.core.config import settings
from app.core.errors import AppError
from app.schemas.scenario import ScenesLLM, CreateScenarioRequest

bedrock = boto3.client('bedrock-runtime', region_name=settings.aws_region)

def _resize_image_if_needed(image_base64: str, max_size_mb: float = 4.5) -> str:
    """이미지 크기가 제한을 초과하면 리사이즈"""
    try:
        # base64 데이터 크기 확인 (MB)
        current_size_mb = len(image_base64) * 3 / 4 / (1024 * 1024)
        
        if current_size_mb <= max_size_mb:
            return image_base64
        
        # 이미지 디코딩 및 리사이즈
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # RGB로 변환 (투명도 제거)
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        
        # 점진적 크기 축소
        quality = 85
        while True:
            # 크기 축소
            ratio = (max_size_mb / current_size_mb) ** 0.6
            new_width = max(256, int(image.width * ratio))
            new_height = max(256, int(image.height * ratio))
            
            resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # JPEG로 압축 저장
            buffer = io.BytesIO()
            resized_image.save(buffer, format='JPEG', quality=quality, optimize=True)
            
            # 결과 크기 확인
            result_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            result_size_mb = len(result_base64) * 3 / 4 / (1024 * 1024)
            
            if result_size_mb <= max_size_mb or quality <= 30:
                return result_base64
            
            quality -= 10
            current_size_mb = result_size_mb
        
    except Exception as e:
        print(f"이미지 리사이즈 실패: {e}")
        # 비상 시 기본 압축
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            image = image.resize((512, 512), Image.Resampling.LANCZOS)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=50)
            return base64.b64encode(buffer.getvalue()).decode("utf-8")
        except:
            return image_base64


def _safe_text(value: str | None, default: str) -> str:
    if value is None:
        return default
    value = str(value).strip()
    return value if value else default


def _mock_character_and_scenes(req: CreateScenarioRequest) -> dict:
    """
    로컬 개발용 mock 응답
    반환 형식은 Bedrock 실제 응답과 동일하게 유지
    """
    name = _safe_text(getattr(req.character, "name", None), "캐릭터")
    where = _safe_text(getattr(req.brief, "where", None), "풀밭")
    what = _safe_text(getattr(req.brief, "what", None), "뛰어논다")
    how = _safe_text(getattr(req.brief, "how", None), "밝고 경쾌하게")

    character_description = (
        f"A cute 3D animated character named {name}, small and lively, "
        f"expressive eyes, soft fur texture, rounded face, charming and playful presence"
    )

    scene_templates = [
        {
            "scene_number": 1,
            "scenario_ko": f"{name}가 {where}에 서서 주변을 천천히 둘러보며 호기심 가득한 표정을 짓는다. 햇살이 부드럽게 비추고, 평화로운 분위기가 감돈다.",
            "image_prompt_en": f"A cute character standing in {where}, curious expression, soft sunlight, peaceful atmosphere, 3D animation style, warm lighting",
            "video_prompt_en": (
                f"{character_description} stands gently in {where}, "
                f"slowly turning head to look around with bright curious eyes, "
                f"soft sunlight filtering through, gentle breeze, calm opening shot, peaceful 3D animation style"
            ),
        },
        {
            "scene_number": 2,
            "scenario_ko": f"{name}가 {where}을 천천히 걸어다니며 {what} 부드럽게 움직인다. 몸짓과 표정에서 즐거운 감정이 자연스럽게 드러난다.",
            "image_prompt_en": f"A cute character walking slowly in {where}, gentle movement, happy expression, soft outdoor lighting, 3D animation",
            "video_prompt_en": (
                f"{character_description} walks slowly across {where}, "
                f"gently moving while {what}, soft body motion, calm facial expression, "
                f"smooth camera tracking, warm outdoor lighting, serene animated feel"
            ),
        },
        {
            "scene_number": 3,
            "scenario_ko": f"{name}가 {where} 한가운데에서 {how} 조용히 움직이며 평화롭게 논다. 마지막에는 만족스러운 표정으로 장면이 마무리된다.",
            "image_prompt_en": f"A cute character in the center of {where}, peaceful play, satisfied expression, golden hour lighting, 3D animation",
            "video_prompt_en": (
                f"{character_description} moves calmly in the center of {where}, "
                f"expressing contentment through gentle posture and peaceful facial expression, "
                f"settling into a satisfying final moment, soft cinematic camera, tranquil 3D animation mood"
            ),
        },
    ]

    # mock도 동일 스키마 검증
    result = {
        "character_description": character_description,
        "scenes": [
            {
                **scene,
                "narration_text": scene["scenario_ko"]  # mock에서는 scenario_ko를 narration으로 사용
            }
            for scene in scene_templates
        ],
    }
    ScenesLLM.model_validate(result)
    return result


def extract_character_description_and_scenes(image_base64: str, req: CreateScenarioRequest) -> dict:
    """
    Sonnet을 사용해서 캐릭터 분석 + 씬 생성을 한 번에 처리
    
    Args:
        image_base64: 캐릭터 이미지 base64
        req: 시나리오 요청 데이터
    
    Returns:
        {"character_description": "...", "scenes": [...]} 형태의 데이터
    """
    use_mock_llm = getattr(settings, "use_mock_llm", False)
    allow_mock_fallback = getattr(settings, "allow_mock_fallback", False)

    if use_mock_llm:
        print("[MOCK] USE_MOCK_LLM=true → Bedrock 호출 없이 mock 시나리오 반환")
        return _mock_character_and_scenes(req)

    try:
        # 이미지 크기 체크 및 리사이즈
        resized_image = _resize_image_if_needed(image_base64)
        
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
                        "media_type": "image/jpeg",
                        "data": resized_image
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

IMPORTANT CONSTRAINTS:
- Each scene is ONLY 4 SECONDS long - keep video prompts simple and focused
- Total narration must be around 12 seconds (all 3 scenes combined)
- Video prompts must describe ONE simple action per scene, not multiple actions
- Narration must be in KOREAN and flow naturally when read aloud

Rules:
- Scenes must flow naturally as a continuous story
- CHARACTER DESCRIPTION must be repeated verbatim at the start of every video_prompt_en
- Express emotion through posture, gesture, facial expression — never abstract labels
- video_prompt_en must start with a motion verb and be CALM and GENTLE, avoid dynamic or energetic actions
- Write video_prompt_en as a single flowing paragraph, present tense
- Focus on subtle, peaceful movements rather than fast or dramatic actions
- Use words like "gently", "slowly", "softly", "calmly" in video prompts
- Avoid words like "energetically", "quickly", "dynamically", "vibrantly"
- Keep video_prompt_en concise (2-3 sentences max) since each scene is only 4 seconds

Output strict JSON only, no markdown, no explanation:
{
  "character_description": "Fixed English description of character appearance. Used as prefix in all scenes.",
  "scenes": [
    {
      "scene_number": 1,
      "scenario_ko": "한국어 시나리오 1-2문장. 간결하게.",
      "image_prompt_en": "English image generation prompt for this scene, describing composition, lighting, and visual elements.",
      "video_prompt_en": "{character_description} + ONE simple gentle action, slow camera movement, peaceful environment. (2-3 sentences max for 4 second scene)",
      "narration_text": "한국어 나레이션 텍스트. 자연스럽게 읽을 수 있는 1-2문장. 전체 3개 씬 합쳐서 12초 분량."
    },
    {
      "scene_number": 2,
      "scenario_ko": "...",
      "image_prompt_en": "...",
      "video_prompt_en": "...",
      "narration_text": "..."
    },
    {
      "scene_number": 3,
      "scenario_ko": "...",
      "image_prompt_en": "...",
      "video_prompt_en": "...",
      "narration_text": "..."
    }
  ]
}

NARRATION GUIDELINES:
- Write in natural spoken Korean
- Each scene's narration should be 3-4 seconds when read aloud
- Total of all 3 scenes should be around 12 seconds
- Use present tense and descriptive language
- Make it sound like a storybook narration
- Example: "작은 고양이가 풀밭에 앉아 나비를 발견합니다. 호기심 가득한 눈으로 천천히 다가가요. 나비와 함께 즐겁게 놀다가 만족스럽게 쉬어갑니다."
"""
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
        print(f"[ERROR] Bedrock Sonnet call failed: {e}")

        if allow_mock_fallback:
            print("[MOCK] ALLOW_MOCK_FALLBACK=true → mock 시나리오로 대체")
            return _mock_character_and_scenes(req)

        raise AppError("UPSTREAM_ERROR", f"Sonnet call failed: {str(e)}", status_code=502)
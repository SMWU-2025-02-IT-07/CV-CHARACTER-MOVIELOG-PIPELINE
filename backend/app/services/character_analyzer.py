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
            "scenario_ko": f"{name}가 {where}에 서서 주변을 둘러본다.",
            "image_prompt_en": f"A cute 3D animated character standing in {where}, curious expression, looking around, soft sunlight, peaceful atmosphere, cinematic composition, warm color palette, shallow depth of field",
            "video_prompt_en": (
                f"{character_description} stands gently in {where}, "
                f"slowly turning head to look around with bright curious eyes, "
                f"soft sunlight filtering through, gentle breeze, calm opening shot, peaceful 3D animation style"
            ),
            "narration_text": f"{name}가 {where}에 서서 주변을 둘러봅니다.",
        },
        {
            "scene_number": 2,
            "scenario_ko": f"{name}가 {where}을 천천히 걸어다닌다.",
            "image_prompt_en": f"A cute 3D animated character walking slowly in {where}, gentle movement, happy expression, mid-shot, soft outdoor lighting, natural environment, warm tones, 3D animation style",
            "video_prompt_en": (
                f"{character_description} walks slowly across {where}, "
                f"gently moving while {what}, soft body motion, calm facial expression, "
                f"smooth camera tracking, warm outdoor lighting, serene animated feel"
            ),
            "narration_text": f"호기심 가득한 눈으로 천천히 걸어갑니다.",
        },
        {
            "scene_number": 3,
            "scenario_ko": f"{name}가 {where}에서 {how} 조용히 논다.",
            "image_prompt_en": f"A cute 3D animated character in the center of {where}, peaceful play, satisfied expression, resting pose, golden hour lighting, soft focus background, cinematic framing, 3D animation",
            "video_prompt_en": (
                f"{character_description} moves calmly in the center of {where}, "
                f"expressing contentment through gentle posture and peaceful facial expression, "
                f"settling into a satisfying final moment, soft cinematic camera, tranquil 3D animation mood"
            ),
            "narration_text": f"{how} 놀다가 만족스럽게 쉬어갑니다.",
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
            "system": """You are a video director specializing in LTX-2 AI video generation and Flux image generation.

Given a character image and a situation, generate exactly 3 connected scenes with CONSISTENT character appearance.

CRITICAL REQUIREMENTS:
- ANALYZE THE CHARACTER IMAGE CAREFULLY: Extract exact visual details (colors, clothing, features, style)
- CHARACTER CONSISTENCY: All scenes must show the SAME character with IDENTICAL appearance (same colors, same clothing, same features)
- LIGHTING CONSISTENCY: Use similar lighting style across all scenes for visual continuity
- COLOR PALETTE CONSISTENCY: Use the same color tone/mood across all scenes
- POSE VARIETY: Each scene should have DIFFERENT pose/action based on the narration content

IMPORTANT CONSTRAINTS:
- Each scene is ONLY 4 SECONDS long - keep everything simple and focused
- Total narration must be around 12 seconds (all 3 scenes combined)
- Each scene's narration should be 3-4 seconds when read aloud
- Narration must be in KOREAN and flow naturally when read aloud

CHARACTER DESCRIPTION RULES:
- Extract from image: exact colors, clothing details, physical features, art style
- Include: body type, face shape, eye color/style, hair/fur color and style, clothing colors and details
- Be SPECIFIC: "blue shirt with white collar" not just "shirt"
- This description will be used as prefix in ALL video/image prompts to ensure consistency
- Example: "A small 3D animated cat with orange and white fur, bright green eyes, wearing a tiny red scarf, rounded face with pink nose, soft fur texture, chibi art style"

IMAGE PROMPT GUIDELINES (for Flux model):
- Describe the FIRST FRAME of the video with the SAME character from the input image
- MUST include all character details from character_description (exact colors, clothing, features)
- Pose should match the narration content naturally (if narration says "looking around", show looking pose; if "walking", show walking pose)
- Include: specific pose based on narration, environment, lighting (consistent across scenes), composition, camera angle
- Use SAME lighting style for all 3 scenes (e.g., "soft morning light" for all)
- Use SAME color palette for all 3 scenes to maintain visual consistency
- Photography terms: "medium shot", "wide shot", "close-up", "shallow depth of field"
- Example: "A small 3D animated cat with orange and white fur, bright green eyes, wearing a tiny red scarf, [pose based on narration], soft morning light, medium shot, warm color palette, shallow depth of field"

VIDEO PROMPT RULES:
- Start with {character_description} verbatim to ensure character consistency
- Add action that matches the narration content
- Use calm, peaceful language: "gently", "slowly", "softly", "calmly"
- Avoid energetic words: "energetically", "quickly", "dynamically"
- Keep concise (2-3 sentences max for 4 second scene)

SCENE PROGRESSION:
- Create 3 scenes that tell a natural story based on the situation
- Each scene should have different action/pose that flows from the narration
- Maintain character appearance consistency while varying the action

Output strict JSON only, no markdown, no explanation:
{
  "character_description": "Detailed English description extracted from the input image. Include: exact colors, clothing details, physical features, art style. Be very specific. This will be used as prefix in all video/image prompts.",
  "scenes": [
    {
      "scene_number": 1,
      "scenario_ko": "한국어 시나리오 1-2문장. 간결하게.",
      "narration_text": "한국어 나레이션. 3-4초 분량 (약 10-15자). 이 내용에 맞는 포즈를 image_prompt에 반영할 것.",
      "image_prompt_en": "[SAME character with ALL specific details: colors, clothing, features] + [pose that matches narration_text content] + environment + consistent lighting + composition. Must include full character_description.",
      "video_prompt_en": "{character_description} + [action matching narration_text], slow camera, peaceful environment. (2-3 sentences max)"
    },
    {
      "scene_number": 2,
      "scenario_ko": "...",
      "narration_text": "...",
      "image_prompt_en": "[SAME character with ALL specific details] + [pose matching this scene's narration] + environment + SAME lighting style + composition.",
      "video_prompt_en": "{character_description} + [action matching narration_text], smooth camera, peaceful environment. (2-3 sentences max)"
    },
    {
      "scene_number": 3,
      "scenario_ko": "...",
      "narration_text": "...",
      "image_prompt_en": "[SAME character with ALL specific details] + [pose matching this scene's narration] + environment + SAME lighting style + composition.",
      "video_prompt_en": "{character_description} + [action matching narration_text], calm camera, peaceful environment. (2-3 sentences max)"
    }
  ]
}

NARRATION GUIDELINES:
- Write in natural spoken Korean
- Each scene: 3-4 seconds when read aloud (약 10-15자)
- Total: around 12 seconds (약 30-45자)
- Use present tense and descriptive language
- Keep SHORT and CONCISE
- The narration content will determine the pose in image_prompt_en
- Example:
  Scene 1 (4초): "작은 고양이가 풀밭에 서서 주변을 둘러봅니다." → image shows standing and looking around
  Scene 2 (4초): "호기심 가득한 눈으로 천천히 걸어갑니다." → image shows walking
  Scene 3 (4초): "만족스럽게 앉아서 쉬어갑니다." → image shows sitting and resting
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
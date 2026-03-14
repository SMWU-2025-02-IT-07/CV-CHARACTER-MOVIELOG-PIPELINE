from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List

class CharacterIn(BaseModel):
    name: str = Field(..., min_length=1)
    image_url: str = Field(..., min_length=1)
    description: Optional[str] = None  # Sonnet이 추출한 캐릭터 설명

class BriefIn(BaseModel):
    who: str = Field(..., min_length=1)
    where: str = Field(..., min_length=1)
    what: str = Field(..., min_length=1)
    how: str = Field(..., min_length=1)

class ScenarioOptions(BaseModel):
    scene_count: int = 3
    lang: str = "ko"

class CreateScenarioRequest(BaseModel):
    character: CharacterIn
    brief: BriefIn
    options: ScenarioOptions = ScenarioOptions()
    skip_character_analysis: bool = False  # Sonnet 캐릭터 분석 스킵 옵션

class SceneOut(BaseModel):
    model_config = ConfigDict(extra="ignore")  # forbid에서 ignore로 변경
    id: int
    title: str
    description: str
    duration: int
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None

class CreateScenarioResponse(BaseModel):
    scenario_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    scenes: List[SceneOut]

class SceneEditIn(BaseModel):
    id: int
    description: str = Field(..., min_length=1)

class RegenerateScenarioRequest(BaseModel):
    scenes: List[SceneEditIn]
    character_image_url: str = Field(..., min_length=1)
    options: ScenarioOptions = ScenarioOptions()

class RegenerateScenarioResponse(BaseModel):
    scenario_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    scenes: List[SceneOut]

class SceneLLM(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scene_number: int
    scenario_ko: str
    image_prompt_en: str
    video_prompt_en: str

class ScenesLLM(BaseModel):
    model_config = ConfigDict(extra="forbid")
    character_description: str
    scenes: list[SceneLLM]

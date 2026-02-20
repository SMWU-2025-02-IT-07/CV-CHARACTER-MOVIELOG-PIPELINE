from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List

class CharacterIn(BaseModel):
    name: str = Field(..., min_length=1)
    image_url: HttpUrl

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

class SceneOut(BaseModel):
    id: int
    title: str
    description: str
    duration_sec: int
    image_url: Optional[HttpUrl] = None

class CreateScenarioResponse(BaseModel):
    scenario_id: str
    scenes: List[SceneOut]

class SceneEditIn(BaseModel):
    id: int
    description: str = Field(..., min_length=1)

class RegenerateScenarioRequest(BaseModel):
    scenes: List[SceneEditIn]
    character_image_url: HttpUrl
    options: ScenarioOptions = ScenarioOptions()

class RegenerateScenarioResponse(BaseModel):
    scenario_id: str
    scenes: List[SceneOut]
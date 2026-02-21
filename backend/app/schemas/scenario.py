from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List

class CharacterIn(BaseModel):
    name: str = Field(..., min_length=1)
    image_url: str = Field(..., min_length=1)

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
    model_config = ConfigDict(extra="forbid")
    id: int
    title: str
    description: str
    duration: int
    image_url: Optional[str] = None

class CreateScenarioResponse(BaseModel):
    scenario_id: str
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
    scenes: List[SceneOut]

class SceneLLM(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    title: str
    description: str
    duration: int

class ScenesLLM(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenes: list[SceneLLM]

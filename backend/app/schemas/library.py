from pydantic import BaseModel
from typing import Optional, List


class LibrarySceneItem(BaseModel):
    id: int
    title: Optional[str] = None
    description: str
    duration: int
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    status: Optional[str] = "pending"


class LibraryScenarioSummary(BaseModel):
    scenario_id: str
    title: str
    created_at: str
    updated_at: Optional[str] = None
    status: str
    thumbnail_url: Optional[str] = None
    final_video_url: Optional[str] = None


class LibraryScenarioDetail(BaseModel):
    scenario_id: str
    title: str
    brief: str
    created_at: str
    updated_at: Optional[str] = None
    status: str
    thumbnail_url: Optional[str] = None
    final_video_url: Optional[str] = None
    scenes: List[LibrarySceneItem]
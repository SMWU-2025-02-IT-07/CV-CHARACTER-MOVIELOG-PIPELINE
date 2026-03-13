from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


ScenarioStatus = Literal[
    "scenario_created",
    "image_generating",
    "image_ready",
    "video_generating",
    "partial_completed",
    "completed",
    "failed",
]

SceneStatus = Literal[
    "pending",
    "image_ready",
    "video_ready",
    "completed",
    "failed",
]


class CharacterMeta(BaseModel):
    name: str
    image_url: Optional[str] = None


class LibrarySceneItem(BaseModel):
    id: int
    title: Optional[str] = None
    description: str
    duration: int
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    status: SceneStatus = "pending"


class LibraryScenarioSummary(BaseModel):
    scenario_id: str
    title: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    status: ScenarioStatus
    thumbnail_url: Optional[str] = None
    final_video_url: Optional[str] = None


class LibraryScenarioDetail(BaseModel):
    scenario_id: str
    title: str
    brief: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    status: ScenarioStatus
    thumbnail_url: Optional[str] = None
    final_video_url: Optional[str] = None
    scenes: list[LibrarySceneItem]


class ScenarioMetadata(BaseModel):
    scenario_id: str
    title: str
    brief: str
    created_at: datetime
    updated_at: datetime
    status: ScenarioStatus
    character: CharacterMeta
    thumbnail_url: Optional[str] = None
    final_video_url: Optional[str] = None
    scenes: list[LibrarySceneItem] = Field(default_factory=list)
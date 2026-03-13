from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from app.schemas.library import (
    CharacterMeta,
    ScenarioMetadata,
    LibrarySceneItem,
)
from backend.app.stores.scenario_metadata_store import save_scenario_index
from app.stores.scenario_source_store import load_source_payload


KST = ZoneInfo("Asia/Seoul")


def _brief_to_text(brief: dict | str | None) -> str:
    if brief is None:
        return ""
    if isinstance(brief, str):
        return brief

    who = brief.get("who", "")
    where = brief.get("where", "")
    what = brief.get("what", "")
    how = brief.get("how", "")
    return " / ".join([x for x in [who, where, what, how] if x])


def create_index_from_source(
    scenario_id: str,
    *,
    character_image_url: str | None = None,
) -> ScenarioMetadata:
    source = load_source_payload(scenario_id)

    req = source.get("request", {})
    scenes = source.get("scenes", [])

    now = datetime.now(KST)

    scene_items = [
        LibrarySceneItem(
            id=scene["id"],
            title=scene.get("title", f"Scene {scene['id']}"),
            description=scene.get("description", ""),
            duration=scene.get("duration", 4),
            image_url=scene.get("image_url"),
            video_url=None,
            status="pending",
        )
        for scene in scenes
    ]

    title = f"{req.get('character', {}).get('name', '캐릭터')}의 시나리오"

    index = ScenarioMetadata(
        scenario_id=scenario_id,
        title=title,
        brief=_brief_to_text(req.get("brief")),
        created_at=now,
        updated_at=now,
        status="scenario_created",
        character=CharacterMeta(
            name=req.get("character", {}).get("name", "unknown"),
            image_url=character_image_url,
        ),
        thumbnail_url=scene_items[0].image_url if scene_items else None,
        final_video_url=None,
        scenes=scene_items,
    )

    save_scenario_index(index)
    return index

from datetime import datetime
from zoneinfo import ZoneInfo

from backend.app.stores.scenario_metadata_store import load_scenario_index, save_scenario_index

KST = ZoneInfo("Asia/Seoul")


def update_scene_image(scenario_id: str, scene_id: int, image_url: str) -> None:
    data = load_scenario_index(scenario_id)

    for scene in data.scenes:
        if scene.id == scene_id:
            scene.image_url = image_url
            scene.status = "image_ready"
            break

    if not data.thumbnail_url:
        data.thumbnail_url = image_url

    if data.status == "scenario_created":
        data.status = "image_ready"

    data.updated_at = datetime.now(KST)
    save_scenario_index(data)

def update_scene_video(scenario_id: str, scene_id: int, video_url: str) -> None:
    data = load_scenario_index(scenario_id)

    for scene in data.scenes:
        if scene.id == scene_id:
            scene.video_url = video_url
            scene.status = "completed"
            break

    all_done = all(scene.video_url for scene in data.scenes)
    data.status = "partial_completed" if not all_done else "completed"
    data.updated_at = datetime.now(KST)

    save_scenario_index(data)

def update_final_video(scenario_id: str, final_video_url: str) -> None:
    data = load_scenario_index(scenario_id)
    data.final_video_url = final_video_url
    data.status = "completed"
    data.updated_at = datetime.now(KST)
    save_scenario_index(data)
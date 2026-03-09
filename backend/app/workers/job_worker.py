from __future__ import annotations

import time

from app.schemas.job import (
    JobError,
    JobStatus,
    MergeResult,
    RenderAllResult,
    RenderSceneResult,
    SceneVideo,
)
from app.stores.job_store import JobNotFoundError, JobStore

store = JobStore()


def process_job(job_id: str) -> None:
    """
    백그라운드에서 실행되는 실제 job 처리 함수
    """
    try:
        job = store.get(job_id)
    except JobNotFoundError:
        return

    try:
        store.update(job_id, status=JobStatus.running, progress=10)

        if job.type.value == "render_scene":
            _process_render_scene(job_id)
        elif job.type.value == "merge":
            _process_merge(job_id)
        elif job.type.value == "render_all":
            _process_render_all(job_id)
        else:
            raise ValueError(f"Unsupported job type: {job.type}")

    except Exception as e:
        store.update(
            job_id,
            status=JobStatus.failed,
            progress=100,
            error=JobError(
                code="JOB_PROCESSING_ERROR",
                message=str(e),
            ),
        )


def _process_render_scene(job_id: str) -> None:
    job = store.get(job_id)
    scenario_id = job.payload.scenario_id
    scene_ids = job.payload.scene_ids

    if not scene_ids:
        raise ValueError("scene_ids is empty")

    scenes: list[SceneVideo] = []
    total = len(scene_ids)

    for idx, scene_id in enumerate(scene_ids, start=1):
        time.sleep(1.0)  # mock 처리 시간

        scenes.append(
            SceneVideo(
                id=scene_id,
                video_url=f"/mock/videos/{scenario_id}/scene_{scene_id}.mp4",
            )
        )

        progress = 10 + int((idx / total) * 80)  # 10~90
        store.update(job_id, status=JobStatus.running, progress=progress)

    result = RenderSceneResult(scenes=scenes)
    store.update(
        job_id,
        status=JobStatus.succeeded,
        progress=100,
        result=result,
    )


def _process_merge(job_id: str) -> None:
    job = store.get(job_id)
    scenario_id = job.payload.scenario_id

    store.update(job_id, status=JobStatus.running, progress=30)
    time.sleep(1.0)

    store.update(job_id, status=JobStatus.running, progress=70)
    time.sleep(1.0)

    result = MergeResult(
        merged_url=f"/mock/videos/{scenario_id}/merged.mp4"
    )
    store.update(
        job_id,
        status=JobStatus.succeeded,
        progress=100,
        result=result,
    )


def _process_render_all(job_id: str) -> None:
    job = store.get(job_id)
    scenario_id = job.payload.scenario_id
    scene_ids = job.payload.scene_ids

    if not scene_ids:
        raise ValueError("scene_ids is empty")

    scenes: list[SceneVideo] = []
    total = len(scene_ids)

    for idx, scene_id in enumerate(scene_ids, start=1):
        time.sleep(1.0)

        scenes.append(
            SceneVideo(
                id=scene_id,
                video_url=f"/mock/videos/{scenario_id}/scene_{scene_id}.mp4",
            )
        )

        progress = 10 + int((idx / total) * 60)  # 10~70
        store.update(job_id, status=JobStatus.running, progress=progress)

    store.update(job_id, status=JobStatus.running, progress=85)
    time.sleep(1.0)

    result = RenderAllResult(
        scenes=scenes,
        merged_url=f"/mock/videos/{scenario_id}/merged.mp4",
    )
    store.update(
        job_id,
        status=JobStatus.succeeded,
        progress=100,
        result=result,
    )
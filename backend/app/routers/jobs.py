from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.schemas.job import JobCreateRequest, JobOut
from app.services.job_service import create_job as create_job_service
from app.services.job_service import get_job, list_jobs as list_jobs_service
from app.services.job_service import run_job
from app.stores.job_store import JobNotFoundError

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobOut)
def create_job(req: JobCreateRequest, background_tasks: BackgroundTasks) -> JobOut:
    job = create_job_service(req)
    background_tasks.add_task(run_job, job.job_id)
    return job


@router.get("/{job_id}", response_model=JobOut)
def poll_job(job_id: str) -> JobOut:
    try:
        return get_job(job_id)
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="job not found")


@router.get("", response_model=list[JobOut])
def list_jobs(
    scenario_id: str = Query(..., description="scenario_id to list jobs for"),
) -> list[JobOut]:
    return list_jobs_service(scenario_id)
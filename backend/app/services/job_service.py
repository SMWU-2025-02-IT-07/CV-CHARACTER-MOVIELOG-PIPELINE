from __future__ import annotations

from app.schemas.job import JobCreateRequest, JobOut
from app.stores.job_store import JobNotFoundError, JobStore
from app.workers.job_worker import process_job

store = JobStore()


def create_job(req: JobCreateRequest) -> JobOut:
    return store.create(req)


def get_job(job_id: str) -> JobOut:
    return store.get(job_id)


def list_jobs(scenario_id: str) -> list[JobOut]:
    return store.list_by_scenario(scenario_id)


def run_job(job_id: str) -> None:
    process_job(job_id)
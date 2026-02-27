from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from app.schemas.job import JobCreateRequest, JobOut
from app.stores.job_store import JobNotFoundError, JobStore

router = APIRouter(prefix="/jobs", tags=["jobs"])

store = JobStore()


@router.post("", response_model=JobOut)
def create_job(req: JobCreateRequest) -> JobOut:
    # 여기서 실제로는 "큐에 넣기" 같은 걸 할 수 있는데,
    # 지금은 store에 job 생성만 하고,
    # 워커/백그라운드 실행은 너희 구조에 맞춰 붙이면 됨.
    return store.create(req)


@router.get("/{job_id}", response_model=JobOut)
def poll_job(job_id: str) -> JobOut:
    try:
        return store.get(job_id)
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="job not found")


@router.get("", response_model=list[JobOut])
def list_jobs(
    scenario_id: str = Query(..., description="scenario_id to list jobs for"),
) -> list[JobOut]:
    # 프론트에서 시나리오 화면 들어오면 이걸 한 번 호출하고,
    # 진행중 job만 /jobs/{job_id}로 폴링하는 방식이 UX 좋음
    return store.list_by_scenario(scenario_id)
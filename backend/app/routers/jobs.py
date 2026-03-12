from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.job import JobCreate, JobUpdate, JobResponse
from app.services.job_service import create_job, update_job, get_job, get_jobs_by_scenario

router = APIRouter(tags=["jobs"])

@router.post("/jobs", response_model=JobResponse)
async def create_new_job(job_data: JobCreate):
    """새 job 생성"""
    return create_job(job_data)

@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """job 상태 조회"""
    return get_job(job_id)

@router.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job_status(job_id: str, update_data: JobUpdate):
    """job 상태 업데이트"""
    return update_job(job_id, update_data)

@router.get("/scenarios/{scenario_id}/jobs", response_model=List[JobResponse])
async def get_scenario_jobs(scenario_id: str):
    """시나리오별 job 목록 조회"""
    return get_jobs_by_scenario(scenario_id)
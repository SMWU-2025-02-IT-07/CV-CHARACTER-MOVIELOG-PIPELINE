import json
from uuid import uuid4
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from app.core.config import settings
from app.core.errors import AppError
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobStatus, JobType

def _ensure_jobs_dir() -> Path:
    d = Path(settings.scenarios_dir) / "jobs"
    d.mkdir(parents=True, exist_ok=True)
    return d

def _job_path(job_id: str) -> Path:
    d = _ensure_jobs_dir()
    return d / f"{job_id}.json"

def create_job(job_data: JobCreate) -> JobResponse:
    """새 job 생성"""
    job_id = str(uuid4())
    now = datetime.now()
    
    job = JobResponse(
        job_id=job_id,
        scenario_id=job_data.scenario_id,
        scene_id=job_data.scene_id,
        job_type=job_data.job_type,
        status=job_data.status,
        created_at=now,
        updated_at=now
    )
    
    try:
        _job_path(job_id).write_text(
            job.model_dump_json(indent=2),
            encoding="utf-8"
        )
        return job
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to create job: {str(e)}", status_code=500)

def update_job(job_id: str, update_data: JobUpdate) -> JobResponse:
    """job 상태 업데이트"""
    job_file = _job_path(job_id)
    if not job_file.exists():
        raise AppError("NOT_FOUND", f"Job not found: {job_id}", status_code=404)
    
    try:
        job_data = json.loads(job_file.read_text(encoding="utf-8"))
        job = JobResponse.model_validate(job_data)
        
        # 업데이트
        job.status = update_data.status
        if update_data.result_url:
            job.result_url = update_data.result_url
        if update_data.error_message:
            job.error_message = update_data.error_message
        job.updated_at = datetime.now()
        
        # 저장
        job_file.write_text(
            job.model_dump_json(indent=2),
            encoding="utf-8"
        )
        
        return job
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to update job: {str(e)}", status_code=500)

def get_job(job_id: str) -> JobResponse:
    """job 조회"""
    job_file = _job_path(job_id)
    if not job_file.exists():
        raise AppError("NOT_FOUND", f"Job not found: {job_id}", status_code=404)
    
    try:
        job_data = json.loads(job_file.read_text(encoding="utf-8"))
        return JobResponse.model_validate(job_data)
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to load job: {str(e)}", status_code=500)

def get_jobs_by_scenario(scenario_id: str) -> List[JobResponse]:
    """시나리오별 job 목록 조회"""
    jobs_dir = _ensure_jobs_dir()
    jobs = []
    
    for job_file in jobs_dir.glob("*.json"):
        try:
            job_data = json.loads(job_file.read_text(encoding="utf-8"))
            job = JobResponse.model_validate(job_data)
            if job.scenario_id == scenario_id:
                jobs.append(job)
        except Exception:
            continue
    
    return sorted(jobs, key=lambda x: x.created_at, reverse=True)
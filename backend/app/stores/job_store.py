from __future__ import annotations

import json
import os
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.schemas.job import (
    JobCreateRequest,
    JobError,
    JobOut,
    JobResult,
    JobStatus,
)


# =========================================================
# Paths
#   backend/app/stores/job_store.py  -> parents[2] = backend/app
#   parents[3] = backend
#   data dir = backend/data/job (요청사항)
# =========================================================
BACKEND_DIR = Path(__file__).resolve().parents[3]  # .../backend
JOB_DATA_DIR = BACKEND_DIR / "data" / "job"
JOBS_DIR = JOB_DATA_DIR / "jobs"
INDEX_DIR = JOB_DATA_DIR / "index"
LOCKS_DIR = JOB_DATA_DIR / "locks"

# scenario별 job 목록 인덱스 파일 저장 위치
def _scenario_index_path(scenario_id: str) -> Path:
    return INDEX_DIR / f"scenario_{scenario_id}.json"


def _job_path(job_id: str) -> Path:
    return JOBS_DIR / f"{job_id}.json"


def _lock_path(name: str) -> Path:
    # name에는 파일명에 안전한 값만 넣는게 좋음
    return LOCKS_DIR / f"{name}.lock"


def _now() -> datetime:
    return datetime.now(timezone.utc).astimezone()


# =========================================================
# Lock (Windows OK): lock file with O_EXCL
# - create lock file exclusively
# - timeout 동안 재시도
# - stale lock(오래된 락) 정리 옵션
# =========================================================
@dataclass
class FileLock:
    lock_file: Path
    timeout_sec: float = 10.0
    poll_interval_sec: float = 0.05
    stale_sec: float = 120.0  # 2분 이상 잠금이면 stale로 간주(작업이 길면 늘려도 됨)

    def acquire(self) -> int:
        self.lock_file.parent.mkdir(parents=True, exist_ok=True)

        deadline = time.time() + self.timeout_sec
        while True:
            # stale lock 처리
            if self.lock_file.exists():
                try:
                    age = time.time() - self.lock_file.stat().st_mtime
                    if age > self.stale_sec:
                        # 락이 너무 오래됨 -> stale로 간주하고 제거 시도
                        try:
                            self.lock_file.unlink()
                        except Exception:
                            pass
                except Exception:
                    pass

            try:
                fd = os.open(str(self.lock_file), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                # 디버그용 최소 정보 기록(필수 아님)
                try:
                    os.write(fd, f"pid={os.getpid()} ts={time.time()}\n".encode("utf-8"))
                except Exception:
                    pass
                return fd
            except FileExistsError:
                if time.time() >= deadline:
                    raise TimeoutError(f"Lock timeout: {self.lock_file}")
                time.sleep(self.poll_interval_sec)

    def release(self, fd: int) -> None:
        try:
            os.close(fd)
        finally:
            # lock file 제거
            try:
                self.lock_file.unlink()
            except FileNotFoundError:
                pass


@contextmanager
def locked(name: str, timeout_sec: float = 10.0):
    lock = FileLock(_lock_path(name), timeout_sec=timeout_sec)
    fd = lock.acquire()
    try:
        yield
    finally:
        lock.release(fd)


# =========================================================
# Atomic JSON write/read
# =========================================================
def _atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + f".tmp.{uuid.uuid4().hex}")

    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    # os.replace: atomic on Windows & POSIX
    os.replace(tmp_path, path)


def _read_json(path: Path) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# =========================================================
# JobStore
# =========================================================
class JobNotFoundError(Exception):
    pass


class JobStore:
    """
    파일 기반 JobStore
    - job: backend/data/job/jobs/{job_id}.json
    - scenario index: backend/data/job/index/scenario_{scenario_id}.json  (job_id 배열)
    - locks: backend/data/job/locks/*.lock
    """

    def __init__(self) -> None:
        JOBS_DIR.mkdir(parents=True, exist_ok=True)
        INDEX_DIR.mkdir(parents=True, exist_ok=True)
        LOCKS_DIR.mkdir(parents=True, exist_ok=True)

    # ---------- index helpers ----------
    def _load_scenario_index(self, scenario_id: str) -> List[str]:
        idx_path = _scenario_index_path(scenario_id)
        if not idx_path.exists():
            return []
        raw = _read_json(idx_path)
        job_ids = raw.get("job_ids", [])
        if not isinstance(job_ids, list):
            return []
        return [str(x) for x in job_ids]

    def _save_scenario_index(self, scenario_id: str, job_ids: List[str]) -> None:
        idx_path = _scenario_index_path(scenario_id)
        payload = {"scenario_id": scenario_id, "job_ids": job_ids, "updated_at": _now().isoformat()}
        _atomic_write_json(idx_path, payload)

    def _append_to_scenario_index(self, scenario_id: str, job_id: str) -> None:
        # scenario index는 경합 가능성이 있으니 별도 lock
        with locked(f"index_{scenario_id}", timeout_sec=10.0):
            job_ids = self._load_scenario_index(scenario_id)
            if job_id not in job_ids:
                job_ids.append(job_id)
                self._save_scenario_index(scenario_id, job_ids)

    # ---------- CRUD ----------
    def create(self, req: JobCreateRequest) -> JobOut:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        now = _now()

        job = JobOut(
            job_id=job_id,
            type=req.type,
            status=JobStatus.queued,
            payload=req.payload,
            result=None,
            error=None,
            progress=0,
            created_at=now,
            updated_at=now,
        )

        # job 파일 저장(해당 job_id 단일 lock)
        with locked(job_id, timeout_sec=10.0):
            _atomic_write_json(_job_path(job_id), job.model_dump(mode="json"))

        # scenario index 업데이트
        self._append_to_scenario_index(req.payload.scenario_id, job_id)
        return job

    def get(self, job_id: str) -> JobOut:
        path = _job_path(job_id)
        if not path.exists():
            raise JobNotFoundError(job_id)

        # 읽기는 보통 lock 없이도 되지만, "쓰는 중" 깨진 파일을 피하려면 잠깐 lock 잡아도 됨
        with locked(job_id, timeout_sec=10.0):
            raw = _read_json(path)

        return JobOut.model_validate(raw)

    def list_by_scenario(self, scenario_id: str) -> List[JobOut]:
        # index 먼저 로드
        with locked(f"index_{scenario_id}", timeout_sec=10.0):
            job_ids = self._load_scenario_index(scenario_id)

        jobs: List[JobOut] = []
        for job_id in job_ids:
            try:
                jobs.append(self.get(job_id))
            except JobNotFoundError:
                # index에 남았는데 파일이 없을 수 있음 -> 무시
                continue

        # created_at 기준 정렬(없으면 updated_at)
        jobs.sort(key=lambda j: (j.created_at or j.updated_at))
        return jobs

    def update(
        self,
        job_id: str,
        *,
        status: Optional[JobStatus] = None,
        progress: Optional[int] = None,
        result: Optional[JobResult] = None,
        error: Optional[JobError] = None,
    ) -> JobOut:
        path = _job_path(job_id)
        if not path.exists():
            raise JobNotFoundError(job_id)

        with locked(job_id, timeout_sec=10.0):
            raw = _read_json(path)
            job = JobOut.model_validate(raw)

            if status is not None:
                job.status = status
            if progress is not None:
                job.progress = max(0, min(100, int(progress)))

            # 성공/실패에 따라 result/error 정리(최소 규칙)
            if result is not None:
                job.result = result
                job.error = None
            if error is not None:
                job.error = error
                job.result = None

            job.updated_at = _now()

            _atomic_write_json(path, job.model_dump(mode="json"))

        return job
import json
from pathlib import Path
from datetime import datetime
from app.core.errors import AppError

BASE_DIR = Path("backend/data/scenario_metadata")


def ensure_scenarios_dir() -> None:
    BASE_DIR.mkdir(parents=True, exist_ok=True)


def scenario_path(scenario_id: str) -> Path:
    ensure_scenarios_dir()
    return BASE_DIR / f"{scenario_id}.json"


def save_scenario_metadata(scenario_id: str, payload: dict) -> None:
    try:
        ensure_scenarios_dir()

        # created_at 없으면 최초 저장 시 생성
        if "created_at" not in payload or not payload.get("created_at"):
            payload["created_at"] = datetime.now().astimezone().isoformat()

        # 저장 시마다 updated_at 갱신
        payload["updated_at"] = datetime.now().astimezone().isoformat()

        scenario_path(scenario_id).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        raise AppError(
            "STORAGE_ERROR",
            f"Failed to save scenario metadata: {str(e)}",
            status_code=500,
        )


def load_scenario_metadata(scenario_id: str) -> dict:
    path = scenario_path(scenario_id)

    if not path.exists():
        raise AppError(
            "NOT_FOUND",
            f"Scenario not found: {scenario_id}",
            status_code=404,
        )

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise AppError(
            "STORAGE_ERROR",
            f"Failed to load scenario metadata: {str(e)}",
            status_code=500,
        )


def list_scenarios(limit: int = 20, offset: int = 0) -> list[dict]:
    ensure_scenarios_dir()
    items: list[dict] = []

    for path in BASE_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            items.append(data)
        except Exception:
            continue

    # updated_at 우선, 없으면 created_at 기준 최신순 정렬
    items.sort(
        key=lambda x: x.get("updated_at") or x.get("created_at") or "",
        reverse=True,
    )

    return items[offset : offset + limit]
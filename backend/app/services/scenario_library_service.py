import json
from pathlib import Path
from datetime import datetime
from app.core.errors import AppError

BASE_DIR = Path("backend/data/scenarios")


def ensure_scenarios_dir():
    BASE_DIR.mkdir(parents=True, exist_ok=True)


def scenario_path(scenario_id: str) -> Path:
    ensure_scenarios_dir()
    return BASE_DIR / f"{scenario_id}.json"


def save_scenario_metadata(scenario_id: str, payload: dict) -> None:
    try:
        ensure_scenarios_dir()
        payload["updated_at"] = datetime.now().astimezone().isoformat()
        scenario_path(scenario_id).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to save scenario metadata: {str(e)}", status_code=500)


def load_scenario_metadata(scenario_id: str) -> dict:
    path = scenario_path(scenario_id)
    if not path.exists():
        raise AppError("NOT_FOUND", f"Scenario not found: {scenario_id}", status_code=404)

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise AppError("STORAGE_ERROR", f"Failed to load scenario metadata: {str(e)}", status_code=500)


def list_scenarios() -> list[dict]:
    ensure_scenarios_dir()
    items = []

    for path in BASE_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            items.append(data)
        except Exception:
            continue

    items.sort(key=lambda x: x.get("updated_at", x.get("created_at", "")), reverse=True)
    return items
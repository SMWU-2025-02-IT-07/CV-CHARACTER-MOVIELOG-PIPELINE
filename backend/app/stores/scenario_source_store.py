from __future__ import annotations

import json
from pathlib import Path


BASE_DIR = Path("backend/data/scenarios")


def ensure_source_dir() -> None:
    BASE_DIR.mkdir(parents=True, exist_ok=True)


def get_source_path(scenario_id: str) -> Path:
    ensure_source_dir()
    return BASE_DIR / f"{scenario_id}.json"


def save_source_payload(scenario_id: str, payload: dict) -> None:
    path = get_source_path(scenario_id)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_source_payload(scenario_id: str) -> dict:
    path = get_source_path(scenario_id)
    if not path.exists():
        raise FileNotFoundError(f"Scenario source not found: {scenario_id}")
    return json.loads(path.read_text(encoding="utf-8"))
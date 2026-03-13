from __future__ import annotations

import json
from pathlib import Path

from app.schemas.library import ScenarioMetadata


BASE_DIR = Path("backend/data/scenario_index")


def ensure_index_dir() -> None:
    BASE_DIR.mkdir(parents=True, exist_ok=True)


def get_index_path(scenario_id: str) -> Path:
    ensure_index_dir()
    return BASE_DIR / f"{scenario_id}.json"


def save_scenario_index(data: ScenarioMetadata) -> None:
    path = get_index_path(data.scenario_id)
    path.write_text(
        data.model_dump_json(indent=2),
        encoding="utf-8",
    )


def load_scenario_index(scenario_id: str) -> ScenarioMetadata:
    path = get_index_path(scenario_id)
    if not path.exists():
        raise FileNotFoundError(f"Scenario index not found: {scenario_id}")
    return ScenarioMetadata.model_validate_json(path.read_text(encoding="utf-8"))


def list_scenario_indexes() -> list[ScenarioMetadata]:
    ensure_index_dir()
    results: list[ScenarioMetadata] = []

    for path in BASE_DIR.glob("*.json"):
        try:
            results.append(
                ScenarioMetadata.model_validate_json(path.read_text(encoding="utf-8"))
            )
        except Exception:
            continue

    results.sort(key=lambda x: x.created_at, reverse=True)
    return results
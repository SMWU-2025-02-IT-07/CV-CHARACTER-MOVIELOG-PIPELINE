from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import hashlib
import json
from pathlib import Path
from app.core.config import settings

router = APIRouter(prefix="/characters", tags=["characters"])

class CharacterDescriptionRequest(BaseModel):
    image_url: str

class CharacterDescriptionResponse(BaseModel):
    description: str
    exists: bool

def _get_character_hash(image_url: str) -> str:
    """이미지 URL의 해시값 생성"""
    return hashlib.md5(image_url.encode()).hexdigest()

def _get_characters_dir() -> Path:
    d = Path(settings.scenarios_dir).parent / "characters"
    d.mkdir(parents=True, exist_ok=True)
    return d

@router.post("/check-description", response_model=CharacterDescriptionResponse)
def check_character_description(req: CharacterDescriptionRequest):
    """캐릭터 description이 이미 존재하는지 확인"""
    char_hash = _get_character_hash(req.image_url)
    char_file = _get_characters_dir() / f"{char_hash}.json"
    
    if char_file.exists():
        try:
            data = json.loads(char_file.read_text(encoding="utf-8"))
            return CharacterDescriptionResponse(
                description=data["description"],
                exists=True
            )
        except:
            pass
    
    return CharacterDescriptionResponse(
        description="",
        exists=False
    )

@router.post("/save-description")
def save_character_description(req: CharacterDescriptionRequest, description: str):
    """캐릭터 description 저장"""
    char_hash = _get_character_hash(req.image_url)
    char_file = _get_characters_dir() / f"{char_hash}.json"
    
    data = {
        "image_url": req.image_url,
        "description": description,
        "hash": char_hash
    }
    
    char_file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    
    return {"message": "Character description saved"}
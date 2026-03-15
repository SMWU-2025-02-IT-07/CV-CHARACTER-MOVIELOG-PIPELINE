from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import requests
import os

router = APIRouter(prefix="/tts", tags=["tts"])

ML_SERVER_URL = os.getenv('ML_SERVER_URL', 'http://16.184.61.191:8000')


class TTSGenerateRequest(BaseModel):
    scenario_id: str
    text: str
    voice_description: Optional[str] = "A bright and friendly young female voice with clear pronunciation. Natural and engaging tone, suitable for storytelling."
    language: Optional[str] = "Korean"
    seed: Optional[int] = 433877847153880


class TTSGenerateResponse(BaseModel):
    prompt_id: str
    status: str
    scenario_id: str
    type: str


@router.post("/generate", response_model=TTSGenerateResponse)
async def generate_tts(request: TTSGenerateRequest):
    """TTS 음성 생성 요청"""
    try:
        print(f"\n=== TTS 생성 요청 ===")
        print(f"시나리오 ID: {request.scenario_id}")
        print(f"텍스트: {request.text[:100]}...")
        
        # ML 서버에 TTS 생성 요청
        response = requests.post(
            f"{ML_SERVER_URL}/generate-tts/{request.scenario_id}",
            data={
                "text": request.text,
                "voice_description": request.voice_description,
                "language": request.language,
                "seed": request.seed
            },
            timeout=30
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"ML server error: {response.text}")
        
        result = response.json()
        
        if "error" in result:
            raise HTTPException(status_code=502, detail=result["error"])
        
        print(f"TTS 생성 시작: prompt_id={result['prompt_id']}")
        
        return TTSGenerateResponse(**result)
        
    except requests.RequestException as e:
        print(f"ML 서버 연결 실패: {e}")
        raise HTTPException(status_code=502, detail=f"ML server connection error: {str(e)}")
    except Exception as e:
        print(f"TTS 생성 요청 실패: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{scenario_id}/{prompt_id}")
async def get_tts_status(scenario_id: str, prompt_id: str):
    """TTS 생성 상태 확인"""
    try:
        response = requests.get(
            f"{ML_SERVER_URL}/tts-status/{scenario_id}/{prompt_id}",
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to check TTS status")
        
        result = response.json()
        print(f"TTS 상태: {result}")
        
        return result
        
    except Exception as e:
        print(f"TTS 상태 확인 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/merge-final/{scenario_id}")
async def merge_final_video(scenario_id: str):
    """영상에 음성 추가 (최종 병합)"""
    try:
        print(f"\n=== 최종 병합 요청: {scenario_id} ===")
        
        response = requests.post(
            f"{ML_SERVER_URL}/merge-final/{scenario_id}",
            timeout=30
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to start final merge")
        
        result = response.json()
        print(f"최종 병합 시작: {result}")
        
        return result
        
    except Exception as e:
        print(f"최종 병합 요청 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/final-merge-status/{scenario_id}")
async def get_final_merge_status(scenario_id: str):
    """최종 병합 상태 확인"""
    try:
        response = requests.get(
            f"{ML_SERVER_URL}/final-merge-status/{scenario_id}",
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to check final merge status")
        
        result = response.json()
        print(f"최종 병합 상태: {result}")
        
        return result
        
    except Exception as e:
        print(f"최종 병합 상태 확인 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

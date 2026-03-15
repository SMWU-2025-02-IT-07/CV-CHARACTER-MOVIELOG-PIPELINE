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


@router.post("/generate/{scenario_id}")
async def generate_tts_from_scenario(scenario_id: str):
    """시나리오 ID로 TTS 음성 생성 (S3에서 narration_text 자동 로드)"""
    try:
        print(f"\n=== TTS 생성 요청 (S3 로드) ===")
        print(f"시나리오 ID: {scenario_id}")
        
        # S3에서 시나리오 메타데이터 로드
        import requests
        s3_url = f"https://comfyui-ml-v2-videos-c8f7625e.s3.ap-northeast-2.amazonaws.com/scenarios/{scenario_id}/metadata.json"
        
        response = requests.get(s3_url, timeout=10)
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail=f"Scenario not found in S3: {scenario_id}")
        
        metadata = response.json()
        scenes = metadata.get("scenes", [])
        
        # 모든 씬의 narration_text 합치기
        narration_texts = []
        for scene in scenes:
            narration_text = scene.get("narration_text") or scene.get("description", "")
            if narration_text:
                narration_texts.append(narration_text)
        
        if not narration_texts:
            raise HTTPException(status_code=400, detail="No narration text found in scenario")
        
        full_narration = " ".join(narration_texts)
        print(f"전체 나레이션 텍스트: {full_narration[:100]}...")
        
        # ML 서버에 TTS 생성 요청
        ml_response = requests.post(
            f"{ML_SERVER_URL}/generate-tts/{scenario_id}",
            data={
                "text": full_narration,
                "voice_description": "A bright and friendly young female voice with clear pronunciation. Natural and engaging tone, suitable for storytelling.",
                "language": "Korean",
                "seed": 433877847153880
            },
            timeout=30
        )
        
        if ml_response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"ML server error: {ml_response.text}")
        
        result = ml_response.json()
        
        if "error" in result:
            raise HTTPException(status_code=502, detail=result["error"])
        
        print(f"TTS 생성 시작: prompt_id={result['prompt_id']}")
        
        return result
        
    except requests.RequestException as e:
        print(f"요청 실패: {e}")
        raise HTTPException(status_code=502, detail=f"Request error: {str(e)}")
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

from fastapi import APIRouter, Query, HTTPException
import traceback

from app.schemas.scenario import (
    CreateScenarioRequest,
    CreateScenarioResponse,
    RegenerateScenarioRequest,
    RegenerateScenarioResponse,
)

from app.services.scenario_service import (
    create_scenario,
    get_scenario,
    list_scenarios,
    regenerate_scenario,
)

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

# =========================
# 생성 API
# =========================
@router.post("", response_model=CreateScenarioResponse)
def create(req: CreateScenarioRequest):
    try:
        print(f"\n=== 시나리오 생성 요청 ===")
        print(f"캐릭터: {req.character.name}")
        print(f"브리프: {req.brief.who} {req.brief.where} {req.brief.what} {req.brief.how}")
        print(f"옵션: 씬 수={req.options.scene_count}, 언어={req.options.lang}")
        
        result = create_scenario(req)
        
        print(f"\n=== Bedrock 응답 결과 ===")
        print(f"시나리오 ID: {result.scenario_id}")
        for i, scene in enumerate(result.scenes, 1):
            print(f"\n[씬 {i}]")
            print(f"  제목: {scene.title}")
            print(f"  설명: {scene.description}")
            print(f"  지속시간: {scene.duration}초")
            print(f"  이미지 프롬프트: {scene.image_prompt}")
            print(f"  비디오 프롬프트: {scene.video_prompt}")
        print(f"\n=== 완료 ===")
        
        return result
    except Exception as e:
        print(f"Error in create endpoint: {e}")
        print(traceback.format_exc())
        raise


@router.get("/{scenario_id}", response_model=CreateScenarioResponse)
def get_one(scenario_id: str):
    try:
        print(f"\n=== 시나리오 조회 요청 ===")
        print(f"시나리오 ID: {scenario_id}")
        
        result = get_scenario(scenario_id)
        
        print(f"시나리오 조회 성공: {len(result.scenes)}개 씬")
        return result
    except Exception as e:
        print(f"Error in get_one endpoint: {e}")
        print(traceback.format_exc())
        raise


@router.get("", response_model=list[CreateScenarioResponse])
def list_all(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return list_scenarios(limit=limit, offset=offset)


@router.post("/{scenario_id}/regenerate", response_model=RegenerateScenarioResponse)
def regenerate(scenario_id: str, req: RegenerateScenarioRequest):
    return regenerate_scenario(scenario_id, req)

@router.post("/{scenario_id}/scenes/{scene_id}/preview")
def generate_scene_preview(scenario_id: str, scene_id: int):
    """씬 미리보기 이미지 생성 요청"""
    try:
        import requests
        import os
        import boto3
        import tempfile
        from pathlib import Path
        
        print(f"Preview generation request: scenario={scenario_id}, scene={scene_id}")
        
        # 시나리오 정보 가져오기
        scenario = get_scenario(scenario_id)
        scene = next((s for s in scenario.scenes if s.id == scene_id), None)
        
        if not scene:
            raise HTTPException(status_code=404, detail="Scene not found")
        
        print(f"Scene found: {scene.description}")
        print(f"Image prompt: {scene.image_prompt}")
        
        # ml-server에 이미지 생성 요청
        ml_server_url = os.getenv('ML_SERVER_URL', 'http://16.184.61.191:8000')
        
        # S3에서 캐릭터 이미지 다운로드
        try:
            s3 = boto3.client('s3')
            bucket = os.getenv('S3_BUCKET_NAME', 'cv-character-movielog-pipeline')
            character_s3_key = f"characters/{scenario_id}/input.png"
            
            # 임시 파일로 다운로드
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
                s3.download_file(bucket, character_s3_key, tmp_file.name)
                
                # ml-server에 FormData로 전송
                with open(tmp_file.name, 'rb') as img_file:
                    files = {'image': ('character.png', img_file, 'image/png')}
                    data = {
                        'prompt': scene.image_prompt or scene.description,
                        'seed': 42
                    }
                    
                    print(f"Sending request to ml-server: {ml_server_url}/generate-image/{scenario_id}/{scene_id}")
                    response = requests.post(
                        f"{ml_server_url}/generate-image/{scenario_id}/{scene_id}",
                        files=files,
                        data=data,
                        timeout=30
                    )
                
                # 임시 파일 삭제
                Path(tmp_file.name).unlink(missing_ok=True)
                
        except Exception as e:
            print(f"Failed to download character image: {e}")
            raise HTTPException(status_code=500, detail=f"Character image not found: {str(e)}")
        
        if response.status_code == 200:
            result = response.json()
            if not result.get("prompt_id"):
                error_message = result.get("error") or "Preview generation failed"
                print(f"ml-server returned invalid preview response: {result}")
                raise HTTPException(status_code=502, detail=error_message)

            print(f"Preview generation started: {result}")
            return result

        print(f"ml-server error: {response.status_code} - {response.text}")
        raise HTTPException(status_code=502, detail="Preview generation failed")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating preview: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{scenario_id}/scenes/{scene_id}/preview/{prompt_id}")
def get_preview_status(scenario_id: str, scene_id: int, prompt_id: str):
    """미리보기 이미지 생성 상태 확인"""
    try:
        import requests
        import os
        from app.services.scenario_service import update_scene_image_url
        
        ml_server_url = os.getenv('ML_SERVER_URL', 'http://16.184.61.191:8000')
        
        response = requests.get(
            f"{ml_server_url}/image-status/{scenario_id}/{scene_id}/{prompt_id}",
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"ML server response: {result}")
            
            # 이미지 생성이 완료되면 image_url 업데이트
            if result.get("status") == "completed":
                # outputs 배열에서 첫 번째 URL 가져오기
                image_url = None
                if "outputs" in result and len(result["outputs"]) > 0:
                    image_url = result["outputs"][0]
                elif "image_url" in result:
                    image_url = result["image_url"]
                
                if image_url:
                    try:
                        print(f"Preview completed for scene {scene_id}, updating image_url: {image_url}")
                        update_scene_image_url(scenario_id, scene_id, image_url)
                        print(f"Scene {scene_id} image_url updated successfully")
                    except Exception as e:
                        print(f"Failed to update scene {scene_id} image_url: {e}")
                        import traceback
                        print(traceback.format_exc())
                else:
                    print(f"Warning: No image URL found in completed response")
            
            return result
        else:
            raise HTTPException(status_code=500, detail="Status check failed")
            
    except Exception as e:
        print(f"Error checking preview status: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

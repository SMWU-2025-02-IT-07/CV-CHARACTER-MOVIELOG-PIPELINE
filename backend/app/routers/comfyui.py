from fastapi import APIRouter, Form, File, UploadFile
from pathlib import Path
import json
import uuid
import requests
import subprocess
import base64
import io
from PIL import Image

from app.core.config import settings
from app.services.scenario_service import get_scene_for_generation, update_scene_result, get_scenario, update_scene_image_url
from app.services.s3_service import upload_scene_video_to_s3

router = APIRouter(prefix="/comfyui", tags=["comfyui"])

COMFYUI_URL = "http://16.184.61.191:8188"
ML_SERVER_URL = "http://16.184.61.191:8000"  # ML 서버 URL

@router.post("/generate-scene-images/{scenario_id}")
async def generate_scene_images(scenario_id: str):
    """각 씬별로 이미지를 생성하고 영상 생성에 사용"""
    print(f"\n=== 씬별 이미지 생성 시작: {scenario_id} ===")
    
    # 시나리오 정보 가져오기
    scenario = get_scenario(scenario_id)
    
    # 원본 캐릭터 이미지 가져오기 (S3에서)
    character_image_url = f"https://cv-character-movielog-pipeline.s3.ap-northeast-2.amazonaws.com/characters/{scenario_id}.png"
    
    results = []
    
    for scene in scenario.scenes:
        print(f"씬 {scene.id} 이미지 생성 중...")
        
        try:
            # 원본 캐릭터 이미지 다운로드
            image_response = requests.get(character_image_url)
            if image_response.status_code != 200:
                print(f"Failed to download character image: {image_response.status_code}")
                continue
                
            # ML 서버에 이미지 생성 요청
            files = {
                'image': ('character.png', image_response.content, 'image/png')
            }
            data = {
                'prompt': scene.image_prompt,
                'seed': 42
            }
            
            ml_response = requests.post(
                f"{ML_SERVER_URL}/generate-image/{scenario_id}/{scene.id}",
                files=files,
                data=data
            )
            
            if ml_response.status_code == 200:
                result = ml_response.json()
                results.append({
                    "scene_id": scene.id,
                    "prompt_id": result["prompt_id"],
                    "status": "processing"
                })
                print(f"씬 {scene.id} 이미지 생성 요청 완료: {result['prompt_id']}")
            else:
                print(f"씬 {scene.id} 이미지 생성 실패: {ml_response.text}")
                results.append({
                    "scene_id": scene.id,
                    "status": "failed",
                    "error": ml_response.text
                })
                
        except Exception as e:
            print(f"씬 {scene.id} 이미지 생성 중 오류: {e}")
            results.append({
                "scene_id": scene.id,
                "status": "failed",
                "error": str(e)
            })
    
    return {
        "scenario_id": scenario_id,
        "results": results
    }

@router.get("/scene-info/{scenario_id}/{scene_id}")
async def get_scene_info_for_test(scenario_id: str, scene_id: int):
    """테스트용: 씬 정보 조회 (get_scene_for_generation 래퍼)"""
    try:
        scene_info = get_scene_for_generation(scenario_id, scene_id)
        return scene_info
    except Exception as e:
        print(f"Error getting scene info: {e}")
        return {"error": str(e)}

@router.post("/generate-scene-video/{scenario_id}/{scene_id}")
async def generate_scene_video(scenario_id: str, scene_id: int):
    """생성된 씬 이미지를 사용해서 영상 생성"""
    print(f"\n=== 씬 영상 생성: {scenario_id}/{scene_id} ===")
    
    # 씬 정보 가져오기
    scene_info = get_scene_for_generation(scenario_id, scene_id)
    print(f"Scene info: {scene_info}")
    
    # input_image 결정: scene.image_url이 있으면 사용, 없으면 원본 캐릭터 이미지
    input_image = scene_info.get('input_image', 'input.png')
    
    # input_image가 'input.png'이면 원본 캐릭터 이미지 사용
    if input_image == 'input.png':
        scene_image_url = f"https://cv-character-movielog-pipeline.s3.ap-northeast-2.amazonaws.com/characters/{scenario_id}.png"
        print(f"Using original character image: {scene_image_url}")
    else:
        # 씬별 생성된 이미지 사용
        scene_image_url = input_image
        print(f"Using scene-specific image: {scene_image_url}")
    
    try:
        image_response = requests.get(scene_image_url)
        if image_response.status_code != 200:
            print(f"Failed to download image from {scene_image_url}: {image_response.status_code}")
            return {"error": f"Scene image not found: {scene_image_url}"}
        
        # ML 서버에 영상 생성 요청
        files = {
            'image': (f'scene_{scene_id}.png', image_response.content, 'image/png')
        }
        data = {
            'prompt': scene_info['video_prompt'],
            'frame_count': 113,
            'seed': 10
        }
        
        print(f"Sending video generation request to ML server...")
        print(f"  - Image source: {scene_image_url}")
        print(f"  - Video prompt: {scene_info['video_prompt'][:100]}...")
        
        ml_response = requests.post(
            f"{ML_SERVER_URL}/generate/{scenario_id}/{scene_id}",
            files=files,
            data=data
        )
        
        if ml_response.status_code == 200:
            result = ml_response.json()
            print(f"씬 {scene_id} 영상 생성 요청 완료: {result['prompt_id']}")
            return result
        else:
            print(f"씬 {scene_id} 영상 생성 실패: {ml_response.text}")
            return {"error": f"Video generation failed: {ml_response.text}"}
            
    except Exception as e:
        print(f"씬 {scene_id} 영상 생성 중 오류: {e}")
        return {"error": str(e)}

@router.post("/update-scene-image/{scenario_id}/{scene_id}")
async def update_scene_image(scenario_id: str, scene_id: int, image_url: str = Form(...)):
    """씬 프리뷰 이미지 생성 완료 후 image_url 업데이트"""
    print(f"\n=== 씬 이미지 URL 업데이트: {scenario_id}/{scene_id} ===")
    print(f"Image URL: {image_url}")
    
    try:
        update_scene_image_url(scenario_id, scene_id, image_url)
        return {
            "status": "success",
            "message": f"Scene {scene_id} image_url updated successfully",
            "image_url": image_url
        }
    except Exception as e:
        print(f"Error updating scene image URL: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

@router.get("/generate-all-videos/{scenario_id}")
async def generate_all_videos(scenario_id: str):
    """모든 씬의 영상을 순차적으로 생성"""
    print(f"\n=== 전체 씬 영상 생성: {scenario_id} ===")
    
    scenario = get_scenario(scenario_id)
    results = []
    
    for scene in scenario.scenes:
        try:
            result = await generate_scene_video(scenario_id, scene.id)
            results.append({
                "scene_id": scene.id,
                "result": result
            })
        except Exception as e:
            results.append({
                "scene_id": scene.id,
                "error": str(e)
            })
    
    return {
        "scenario_id": scenario_id,
        "results": results
    }

@router.post("/workflow/{scenario_id}")
async def execute_full_workflow(scenario_id: str):
    """전체 워크플로우 실행: 씬별 이미지 생성 → 영상 생성"""
    print(f"\n=== 전체 워크플로우 시작: {scenario_id} ===")
    
    # 1단계: 모든 씬의 이미지 생성
    print("1단계: 씬별 이미지 생성")
    image_results = await generate_scene_images(scenario_id)
    
    # 이미지 생성 완료 대기 (간단한 폴링)
    import asyncio
    await asyncio.sleep(5)  # 초기 대기
    
    # 이미지 생성 상태 확인
    completed_scenes = []
    max_retries = 30  # 최대 5분 대기
    
    for retry in range(max_retries):
        all_completed = True
        
        for result in image_results["results"]:
            if result["status"] == "processing" and "prompt_id" in result:
                # ML 서버에서 이미지 생성 상태 확인
                try:
                    status_response = requests.get(
                        f"{ML_SERVER_URL}/image-status/{scenario_id}/{result['scene_id']}/{result['prompt_id']}"
                    )
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        if status_data["status"] == "completed":
                            result["status"] = "completed"
                            completed_scenes.append(result["scene_id"])
                            print(f"씬 {result['scene_id']} 이미지 생성 완료")
                            
                            # 생성된 이미지 URL로 scene image_url 업데이트
                            if "image_url" in status_data:
                                try:
                                    print(f"ML 서버 응답에서 image_url 발견: {status_data['image_url']}")
                                    update_scene_image_url(scenario_id, result["scene_id"], status_data["image_url"])
                                    print(f"씬 {result['scene_id']} image_url 업데이트 완료: {status_data['image_url']}")
                                except Exception as e:
                                    print(f"씬 {result['scene_id']} image_url 업데이트 실패: {e}")
                                    import traceback
                                    print(traceback.format_exc())
                            else:
                                print(f"경고: ML 서버 응답에 image_url이 없음. 응답 내용: {status_data}")
                        else:
                            all_completed = False
                    else:
                        all_completed = False
                except Exception as e:
                    print(f"씬 {result['scene_id']} 상태 확인 실패: {e}")
                    all_completed = False
        
        if all_completed:
            break
            
        await asyncio.sleep(10)  # 10초 대기 후 재시도
    
    print(f"이미지 생성 완료된 씬: {completed_scenes}")
    
    # 2단계: 완료된 씬들의 영상 생성
    print("2단계: 씬별 영상 생성")
    video_results = []
    
    for scene_id in completed_scenes:
        try:
            result = await generate_scene_video(scenario_id, scene_id)
            video_results.append({
                "scene_id": scene_id,
                "result": result
            })
            print(f"씬 {scene_id} 영상 생성 요청 완료")
        except Exception as e:
            video_results.append({
                "scene_id": scene_id,
                "error": str(e)
            })
            print(f"씬 {scene_id} 영상 생성 실패: {e}")
    
    return {
        "scenario_id": scenario_id,
        "workflow_status": "completed",
        "image_results": image_results,
        "video_results": video_results,
        "completed_scenes": completed_scenes
    }


async def generate_scene_legacy(
    scenario_id: str,
    scene_id: int,
    image: UploadFile = File(...),
    frame_count: int = Form(113),
    seed: int = Form(10)
):
    print(f"\n=== ComfyUI 영상 생성 시작 ===")
    print(f"Scenario ID: {scenario_id}, Scene ID: {scene_id}")
    
    # 씬 정보 가져오기
    scene_info = get_scene_for_generation(scenario_id, scene_id)
    print(f"Video prompt: {scene_info['video_prompt'][:100]}...")
    
    # 워크플로우 가져오기 (올바른 경로로 수정)
    print(f"Using hardcoded workflow due to server connection issues")
    
    # 완전한 LTX-2 워크플로우 (더 정교한 버전)
    workflow = {
        "75": {
            "inputs": {
                "filename_prefix": "video/LTX_2.0_i2v",
                "format": "auto",
                "codec": "auto",
                "video": ["92:97", 0]
            },
            "class_type": "SaveVideo"
        },
        "98": {
            "inputs": {
                "image": "placeholder.png"
            },
            "class_type": "LoadImage"
        },
        "102": {
            "inputs": {
                "resize_type": "scale dimensions",
                "resize_type.width": 960,
                "resize_type.height": 640,
                "resize_type.crop": "center",
                "scale_method": "lanczos",
                "input": ["98", 0]
            },
            "class_type": "ResizeImageMaskNode"
        },
        "92:8": {
            "inputs": {
                "sampler_name": "euler"
            },
            "class_type": "KSamplerSelect"
        },
        "92:60": {
            "inputs": {
                "text_encoder": "gemma_3_12B_it.safetensors",
                "ckpt_name": "ltx-2-19b-dev-fp8.safetensors",
                "device": "default"
            },
            "class_type": "LTXAVTextEncoderLoader"
        },
        "92:81": {
            "inputs": {
                "positive": ["92:22", 0],
                "negative": ["92:22", 1],
                "latent": ["92:80", 0]
            },
            "class_type": "LTXVCropGuides"
        },
        "92:51": {
            "inputs": {
                "frames_number": ["92:62", 0],
                "frame_rate": 25,
                "batch_size": 1,
                "audio_vae": ["92:48", 0]
            },
            "class_type": "LTXVEmptyLatentAudio"
        },
        "92:22": {
            "inputs": {
                "frame_rate": 25,
                "positive": ["92:3", 0],
                "negative": ["92:4", 0]
            },
            "class_type": "LTXVConditioning"
        },
        "92:4": {
            "inputs": {
                "text": "blurry, low quality, still frame, frames, watermark, overlay, titles, has blurbox, has subtitles",
                "clip": ["92:60", 0]
            },
            "class_type": "CLIPTextEncode"
        },
        "92:89": {
            "inputs": {
                "width": ["92:105", 0],
                "height": ["92:105", 1],
                "batch_size": 1,
                "color": 0
            },
            "class_type": "EmptyImage"
        },
        "92:41": {
            "inputs": {
                "noise": ["92:11", 0],
                "guider": ["92:47", 0],
                "sampler": ["92:8", 0],
                "sigmas": ["92:9", 0],
                "latent_image": ["92:56", 0]
            },
            "class_type": "SamplerCustomAdvanced"
        },
        "92:11": {
            "inputs": {
                "noise_seed": 10
            },
            "class_type": "RandomNoise"
        },
        "92:97": {
            "inputs": {
                "fps": 25,
                "images": ["92:113", 0]
            },
            "class_type": "CreateVideo"
        },
        "92:80": {
            "inputs": {
                "av_latent": ["92:41", 0]
            },
            "class_type": "LTXVSeparateAVLatent"
        },
        "92:48": {
            "inputs": {
                "ckpt_name": "ltx-2-19b-dev-fp8.safetensors"
            },
            "class_type": "LTXVAudioVAELoader"
        },
        "92:56": {
            "inputs": {
                "video_latent": ["92:107", 0],
                "audio_latent": ["92:51", 0]
            },
            "class_type": "LTXVConcatAVLatent"
        },
        "92:90": {
            "inputs": {
                "upscale_method": "lanczos",
                "scale_by": 0.5,
                "image": ["92:89", 0]
            },
            "class_type": "ImageScaleBy"
        },
        "92:62": {
            "inputs": {
                "value": 113
            },
            "class_type": "PrimitiveInt"
        },
        "92:91": {
            "inputs": {
                "image": ["92:90", 0]
            },
            "class_type": "GetImageSize"
        },
        "92:105": {
            "inputs": {
                "image": ["102", 0]
            },
            "class_type": "GetImageSize"
        },
        "92:99": {
            "inputs": {
                "img_compression": 33,
                "image": ["92:106", 0]
            },
            "class_type": "LTXVPreprocess"
        },
        "92:43": {
            "inputs": {
                "width": ["92:91", 0],
                "height": ["92:91", 1],
                "length": ["92:62", 0],
                "batch_size": 1
            },
            "class_type": "EmptyLTXVLatentVideo"
        },
        "92:107": {
            "inputs": {
                "strength": 1,
                "bypass": False,
                "vae": ["92:1", 2],
                "image": ["92:99", 0],
                "latent": ["92:43", 0]
            },
            "class_type": "LTXVImgToVideoInplace"
        },
        "92:1": {
            "inputs": {
                "ckpt_name": "ltx-2-19b-dev-fp8.safetensors"
            },
            "class_type": "CheckpointLoaderSimple"
        },
        "92:47": {
            "inputs": {
                "cfg": 3,
                "model": ["92:1", 0],
                "positive": ["92:22", 0],
                "negative": ["92:22", 1]
            },
            "class_type": "CFGGuider"
        },
        "92:9": {
            "inputs": {
                "steps": 15,
                "max_shift": 2.05,
                "base_shift": 0.95,
                "stretch": True,
                "terminal": 0.1,
                "latent": ["92:56", 0]
            },
            "class_type": "LTXVScheduler"
        },
        "92:106": {
            "inputs": {
                "longer_edge": 512,
                "images": ["102", 0]
            },
            "class_type": "ResizeImagesByLongerEdge"
        },
        "92:113": {
            "inputs": {
                "tile_size": 512,
                "overlap": 64,
                "temporal_size": 64,
                "temporal_overlap": 8,
                "samples": ["92:81", 2],
                "vae": ["92:1", 2]
            },
            "class_type": "VAEDecodeTiled"
        },
        "92:3": {
            "inputs": {
                "text": "placeholder prompt",
                "clip": ["92:60", 0]
            },
            "class_type": "CLIPTextEncode"
        }
    }
    print(f"Workflow loaded successfully, nodes: {list(workflow.keys())[:5]}...")
    
    # 이미지를 FormData로 ComfyUI에 업로드
    image_content = await image.read()
    files = {"image": (image.filename, image_content, image.content_type)}
    upload_response = requests.post(f"{COMFYUI_URL}/upload/image", files=files)
    
    if upload_response.status_code != 200:
        print(f"Image upload failed: {upload_response.status_code}")
        return {"error": f"Image upload failed: {upload_response.text}"}
    
    uploaded_image = upload_response.json()
    image_filename = uploaded_image["name"]
    print(f"Image uploaded: {image_filename}")

    # 워크플로우 설정 (안전한 처리)
    try:
        if "98" in workflow:
            workflow["98"]["inputs"]["image"] = image_filename  # LoadImage 노드
        if "92:3" in workflow:
            workflow["92:3"]["inputs"]["text"] = scene_info["video_prompt"]  # 포지티브 프롬프트
        if "92:62" in workflow:
            workflow["92:62"]["inputs"]["value"] = frame_count  # 프레임 수
        if "92:11" in workflow:
            workflow["92:11"]["inputs"]["noise_seed"] = seed  # 시드값
        
        print(f"Workflow configured:")
        print(f"  - Image: {image_filename}")
        print(f"  - Prompt: {scene_info['video_prompt'][:50]}...")
        print(f"  - Frames: {frame_count}")
        print(f"  - Seed: {seed}")
        
    except KeyError as e:
        print(f"Workflow node missing: {e}")
        print(f"Available nodes: {list(workflow.keys())}")
        return {"error": f"Workflow configuration failed: missing node {e}"}

    # ComfyUI 실행
    prompt_payload = {"prompt": workflow}
    print(f"Sending prompt to ComfyUI: {COMFYUI_URL}/prompt")
    response = requests.post(f"{COMFYUI_URL}/prompt", json=prompt_payload)

    if response.status_code != 200:
        print(f"ComfyUI prompt failed: {response.status_code} - {response.text}")
        return {"error": f"ComfyUI error: {response.text}"}

    result = response.json()
    prompt_id = result["prompt_id"]
    print(f"ComfyUI prompt submitted successfully: {prompt_id}")
    
    return {"prompt_id": prompt_id, "status": "processing", "scene_id": scene_id}

@router.get("/status/{scenario_id}/{scene_id}/{prompt_id}")
async def check_status(scenario_id: str, scene_id: int, prompt_id: str):
    print(f"\n=== 상태 확인: {prompt_id} ===")
    response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
    history = response.json()
    
    print(f"History response status: {response.status_code}")
    print(f"History keys: {list(history.keys()) if history else 'None'}")
    
    if prompt_id not in history:
        print(f"Prompt ID {prompt_id} not found in history")
        return {"status": "processing"}
    
    prompt_data = history[prompt_id]
    print(f"Prompt data keys: {list(prompt_data.keys())}")
    
    outputs = prompt_data.get("outputs", {})
    print(f"Outputs: {list(outputs.keys()) if outputs else 'None'}")
    
    if not outputs:
        print("No outputs found, still processing")
        return {"status": "processing"}

    # 완료 → 영상 파일 찾기
    video_filename = None
    print(f"Searching for video in outputs...")
    
    # SaveVideo 노드(75번)에서 비디오 파일 찾기
    for node_id, node_output in outputs.items():
        print(f"Node {node_id}: {list(node_output.keys()) if isinstance(node_output, dict) else type(node_output)}")
        if isinstance(node_output, dict):
            # videos 키 확인
            if "videos" in node_output:
                video_info = node_output["videos"][0]
                video_filename = video_info["filename"] if isinstance(video_info, dict) else video_info
                print(f"Found video in node {node_id}: {video_filename}")
                break
            # gifs 키도 확인 (일부 경우)
            elif "gifs" in node_output:
                video_info = node_output["gifs"][0]
                video_filename = video_info["filename"] if isinstance(video_info, dict) else video_info
                print(f"Found gif in node {node_id}: {video_filename}")
                break
    
    if not video_filename:
        print("No video file found in outputs, checking all output structure:")
        for node_id, node_output in outputs.items():
            print(f"  Node {node_id}: {node_output}")
        return {"status": "processing"}

    print(f"Video generation completed: {video_filename}")
    return {
        "status": "completed",
        "video_url": f"{COMFYUI_URL}/view?filename={video_filename}&type=output",
        "video_filename": video_filename
    }
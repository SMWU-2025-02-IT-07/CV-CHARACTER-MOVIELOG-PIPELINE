from fastapi import APIRouter, Form, File, UploadFile
from pathlib import Path
import json
import uuid
import requests
import subprocess

from app.core.config import settings
from app.services.scenario_service import get_scene_for_generation, update_scene_result
from app.services.s3_service import upload_scene_video_to_s3

router = APIRouter(prefix="/comfyui", tags=["comfyui"])

COMFYUI_URL = "http://16.184.61.191:8188"

@router.post("/generate/{scenario_id}/{scene_id}")
async def generate_scene(
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
    
    # 실제 워크플로우 JSON을 직접 사용
    workflow = {
        "75": {"inputs": {"filename_prefix": "video/LTX_2.0_i2v", "format": "auto", "codec": "auto", "video": ["92:97", 0]}, "class_type": "SaveVideo"},
        "98": {"inputs": {"image": "nova_canvas_output.png"}, "class_type": "LoadImage"},
        "102": {"inputs": {"resize_type": "scale dimensions", "resize_type.width": 960, "resize_type.height": 640, "resize_type.crop": "center", "scale_method": "lanczos", "input": ["98", 0]}, "class_type": "ResizeImageMaskNode"},
        "92:8": {"inputs": {"sampler_name": "euler"}, "class_type": "KSamplerSelect"},
        "92:60": {"inputs": {"text_encoder": "gemma_3_12B_it.safetensors", "ckpt_name": "ltx-2-19b-dev-fp8.safetensors", "device": "default"}, "class_type": "LTXAVTextEncoderLoader"},
        "92:81": {"inputs": {"positive": ["92:22", 0], "negative": ["92:22", 1], "latent": ["92:80", 0]}, "class_type": "LTXVCropGuides"},
        "92:22": {"inputs": {"frame_rate": 25, "positive": ["92:3", 0], "negative": ["92:4", 0]}, "class_type": "LTXVConditioning"},
        "92:4": {"inputs": {"text": "blurry, low quality, still frame, frames, watermark, overlay, titles, has blurbox, has subtitles", "clip": ["92:60", 0]}, "class_type": "CLIPTextEncode"},
        "92:41": {"inputs": {"noise": ["92:11", 0], "guider": ["92:47", 0], "sampler": ["92:8", 0], "sigmas": ["92:9", 0], "latent_image": ["92:56", 0]}, "class_type": "SamplerCustomAdvanced"},
        "92:11": {"inputs": {"noise_seed": 10}, "class_type": "RandomNoise"},
        "92:97": {"inputs": {"fps": 25, "images": ["92:113", 0]}, "class_type": "CreateVideo"},
        "92:80": {"inputs": {"av_latent": ["92:41", 0]}, "class_type": "LTXVSeparateAVLatent"},
        "92:56": {"inputs": {"video_latent": ["92:107", 0], "audio_latent": ["92:51", 0]}, "class_type": "LTXVConcatAVLatent"},
        "92:62": {"inputs": {"value": 113}, "class_type": "PrimitiveInt"},
        "92:105": {"inputs": {"image": ["102", 0]}, "class_type": "GetImageSize"},
        "92:99": {"inputs": {"img_compression": 33, "image": ["92:106", 0]}, "class_type": "LTXVPreprocess"},
        "92:43": {"inputs": {"width": ["92:91", 0], "height": ["92:91", 1], "length": ["92:62", 0], "batch_size": 1}, "class_type": "EmptyLTXVLatentVideo"},
        "92:107": {"inputs": {"strength": 1, "bypass": False, "vae": ["92:1", 2], "image": ["92:99", 0], "latent": ["92:43", 0]}, "class_type": "LTXVImgToVideoInplace"},
        "92:1": {"inputs": {"ckpt_name": "ltx-2-19b-dev-fp8.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "92:47": {"inputs": {"cfg": 3, "model": ["92:1", 0], "positive": ["92:22", 0], "negative": ["92:22", 1]}, "class_type": "CFGGuider"},
        "92:9": {"inputs": {"steps": 15, "max_shift": 2.05, "base_shift": 0.95, "stretch": True, "terminal": 0.1, "latent": ["92:56", 0]}, "class_type": "LTXVScheduler"},
        "92:106": {"inputs": {"longer_edge": 512, "images": ["102", 0]}, "class_type": "ResizeImagesByLongerEdge"},
        "92:113": {"inputs": {"tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8, "samples": ["92:81", 2], "vae": ["92:1", 2]}, "class_type": "VAEDecodeTiled"},
        "92:3": {"inputs": {"text": "placeholder prompt", "clip": ["92:60", 0]}, "class_type": "CLIPTextEncode"},
        "92:51": {"inputs": {"frames_number": ["92:62", 0], "frame_rate": 25, "batch_size": 1, "audio_vae": ["92:48", 0]}, "class_type": "LTXVEmptyLatentAudio"},
        "92:48": {"inputs": {"ckpt_name": "ltx-2-19b-dev-fp8.safetensors"}, "class_type": "LTXVAudioVAELoader"},
        "92:89": {"inputs": {"width": ["92:105", 0], "height": ["92:105", 1], "batch_size": 1, "color": 0}, "class_type": "EmptyImage"},
        "92:90": {"inputs": {"upscale_method": "lanczos", "scale_by": 0.5, "image": ["92:89", 0]}, "class_type": "ImageScaleBy"},
        "92:91": {"inputs": {"image": ["92:90", 0]}, "class_type": "GetImageSize"}
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
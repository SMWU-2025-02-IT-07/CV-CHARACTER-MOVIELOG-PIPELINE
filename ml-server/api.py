from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from s3_uploader import S3Uploader
import requests
import uuid
import os
import json
from pathlib import Path
import threading

app = FastAPI()

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://d1otafw1wb5gvu.cloudfront.net",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
uploader = S3Uploader()

COMFYUI_URL = "http://localhost:8188"
BACKEND_URL = os.getenv('BACKEND_URL', 'http://43.202.58.164:8000')

@app.post("/generate/{scenario_id}/{scene_id}")
async def generate(
    scenario_id: str,
    scene_id: int,
    prompt: str = Form(...),
    image: UploadFile = File(...),
    frame_count: int = Form(113),
    seed: int = Form(10)
):
    # 이미지를 ComfyUI input 폴더에 저장
    comfy_input_dir = Path("./ComfyUI/input")
    comfy_input_dir.mkdir(exist_ok=True)
    
    # 미리보기 이미지가 있으면 사용, 없으면 업로드된 이미지 사용
    if image.filename and image.filename != "undefined":
        # 직접 업로드된 이미지 (캐릭터 원본 또는 미리보기)
        image_filename = f"{scenario_id}_scene_{scene_id}_{image.filename}"
        image_path = comfy_input_dir / image_filename
        
        with open(image_path, "wb") as f:
            f.write(await image.read())
    else:
        # S3에서 미리보기 이미지 다운로드
        try:
            import boto3
            s3 = boto3.client('s3')
            bucket = os.getenv('S3_BUCKET_NAME', 'cv-character-movielog-pipeline')
            s3_key = f"preview/{scenario_id}/scene_{scene_id}.png"
            
            image_filename = f"{scenario_id}_scene_{scene_id}_preview.png"
            image_path = comfy_input_dir / image_filename
            
            s3.download_file(bucket, s3_key, str(image_path))
            print(f"Downloaded preview image from S3: {s3_key}")
        except Exception as e:
            print(f"Failed to download preview image: {e}")
            return {"error": "Preview image not found. Please generate preview first."}
    
    print(f"Image saved to: {image_path}")
    print(f"Scenario: {scenario_id}, Scene: {scene_id}")
    
    # LTX 워크플로우 구성
    workflow = {
        "98": {
            "inputs": {
                "image": image_filename
            },
            "class_type": "LoadImage"
        },
        "102": {
            "inputs": {
                "input": ["98", 0],
                "resize_type": "scale dimensions",
                "resize_type.width": 960,
                "resize_type.height": 640,
                "resize_type.crop": "center",
                "scale_method": "lanczos"
            },
            "class_type": "ResizeImageMaskNode"
        },
        "1": {
            "inputs": {
                "ckpt_name": "ltx-2-19b-dev-fp8.safetensors"
            },
            "class_type": "CheckpointLoaderSimple"
        },
        "60": {
            "inputs": {
                "text_encoder": "gemma_3_12B_it.safetensors",
                "ckpt_name": "ltx-2-19b-dev-fp8.safetensors",
                "device": "default"
            },
            "class_type": "LTXAVTextEncoderLoader"
        },
        "3": {
            "inputs": {
                "text": prompt,
                "clip": ["60", 0]
            },
            "class_type": "CLIPTextEncode"
        },
        "4": {
            "inputs": {
                "text": "blurry, low quality, still frame, frames, watermark, overlay, titles, has blurbox, has subtitles",
                "clip": ["60", 0]
            },
            "class_type": "CLIPTextEncode"
        },
        "22": {
            "inputs": {
                "positive": ["3", 0],
                "negative": ["4", 0],
                "frame_rate": 25.0
            },
            "class_type": "LTXVConditioning"
        },
        "43": {
            "inputs": {
                "width": 960,
                "height": 640,
                "length": frame_count,
                "batch_size": 1
            },
            "class_type": "EmptyLTXVLatentVideo"
        },
        "107": {
            "inputs": {
                "vae": ["1", 2],
                "image": ["102", 0],
                "latent": ["43", 0],
                "strength": 1.0,
                "bypass": False
            },
            "class_type": "LTXVImgToVideoInplace"
        },
        "48": {
            "inputs": {
                "ckpt_name": "ltx-2-19b-dev-fp8.safetensors"
            },
            "class_type": "LTXVAudioVAELoader"
        },
        "51": {
            "inputs": {
                "audio_vae": ["48", 0],
                "frames_number": frame_count,
                "frame_rate": 25,
                "batch_size": 1
            },
            "class_type": "LTXVEmptyLatentAudio"
        },
        "56": {
            "inputs": {
                "video_latent": ["107", 0],
                "audio_latent": ["51", 0]
            },
            "class_type": "LTXVConcatAVLatent"
        },
        "11": {
            "inputs": {
                "noise_seed": seed
            },
            "class_type": "RandomNoise"
        },
        "8": {
            "inputs": {
                "sampler_name": "euler"
            },
            "class_type": "KSamplerSelect"
        },
        "9": {
            "inputs": {
                "latent": ["56", 0],
                "steps": 15,
                "max_shift": 2.05,
                "base_shift": 0.95,
                "stretch": True,
                "terminal": 0.1
            },
            "class_type": "LTXVScheduler"
        },
        "47": {
            "inputs": {
                "model": ["1", 0],
                "positive": ["22", 0],
                "negative": ["22", 1],
                "cfg": 3.0
            },
            "class_type": "CFGGuider"
        },
        "41": {
            "inputs": {
                "noise": ["11", 0],
                "guider": ["47", 0],
                "sampler": ["8", 0],
                "sigmas": ["9", 0],
                "latent_image": ["56", 0]
            },
            "class_type": "SamplerCustomAdvanced"
        },
        "80": {
            "inputs": {
                "av_latent": ["41", 0]
            },
            "class_type": "LTXVSeparateAVLatent"
        },
        "113": {
            "inputs": {
                "samples": ["80", 0],
                "vae": ["1", 2],
                "tile_size": 512,
                "overlap": 64,
                "temporal_size": 64,
                "temporal_overlap": 8
            },
            "class_type": "VAEDecodeTiled"
        },
        "96": {
            "inputs": {
                "samples": ["80", 1],
                "audio_vae": ["48", 0]
            },
            "class_type": "LTXVAudioVAEDecode"
        },
        "97": {
            "inputs": {
                "images": ["113", 0],
                "audio": ["96", 0],
                "fps": 25.0
            },
            "class_type": "CreateVideo"
        },
        "75": {
            "inputs": {
                "video": ["97", 0],
                "filename_prefix": f"videos/{scenario_id}/scene_{scene_id}",
                "format": "auto",
                "codec": "auto"
            },
            "class_type": "SaveVideo"
        }
    }
    
    # ComfyUI 실행
    response = requests.post(f"{COMFYUI_URL}/prompt", json={"prompt": workflow})
    
    if response.status_code != 200:
        return {"error": f"ComfyUI error: {response.text}"}
    
    prompt_id = response.json()["prompt_id"]
    
    return {
        "prompt_id": prompt_id, 
        "status": "processing",
        "scenario_id": scenario_id,
        "scene_id": scene_id
    }

@app.get("/status/{scenario_id}/{scene_id}/{prompt_id}")
async def status(scenario_id: str, scene_id: int, prompt_id: str):
    response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
    history = response.json()
    
    if prompt_id in history and history[prompt_id].get("outputs"):
        # 완료되면 S3 업로드 (scenario_id 기준)
        output_files = []
        for node_output in history[prompt_id]["outputs"].values():
            for key in ["videos", "images"]:
                if key in node_output:
                    for video in node_output[key]:
                        # 로컬 파일 경로
                        if video.get("subfolder"):
                            local_path = f"./output/{video['subfolder']}/{video['filename']}"
                        else:
                            local_path = f"./output/{video['filename']}"
                        
                        print(f"Uploading video to S3: {local_path}")
                        try:
                            # S3 업로드 (scenario_id 기준 경로)
                            s3_key = f"videos/{scenario_id}/scene_{scene_id}.mp4"
                            s3_url = uploader.upload_file_with_key(local_path, s3_key)
                            output_files.append(s3_url)
                            print(f"Successfully uploaded: {s3_url}")
                            
                            # Backend에 메타데이터 전송
                            try:
                                notify_payload = {
                                    "scenario_id": scenario_id,
                                    "scene_id": scene_id,
                                    "video_url": s3_url,
                                    "status": "completed"
                                }
                                notify_response = requests.post(
                                    f"{BACKEND_URL}/api/v1/scenes/complete",
                                    json=notify_payload,
                                    timeout=10
                                )
                                print(f"Backend notification sent: {notify_response.status_code}")
                            except Exception as e:
                                print(f"Failed to notify backend: {e}")
                                
                        except Exception as e:
                            print(f"Failed to upload {local_path}: {e}")
        
        return {"status": "completed", "outputs": output_files}
    
    return {"status": "processing"}

# 기존 API 호환성 유지
@app.post("/generate")
async def generate_legacy(
    prompt: str = Form(...),
    image: UploadFile = File(...),
    frame_count: int = Form(113),
    seed: int = Form(10)
):
    # 임시 scenario_id, scene_id 생성
    scenario_id = str(uuid.uuid4())
    scene_id = 1
    return await generate(scenario_id, scene_id, prompt, image, frame_count, seed)

@app.get("/status/{prompt_id}")
async def status_legacy(prompt_id: str):
    # 기존 방식으로 처리 (scenario_id 없이)
    response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
    history = response.json()
    
    if prompt_id in history and history[prompt_id].get("outputs"):
        output_files = []
        for node_output in history[prompt_id]["outputs"].values():
            for key in ["videos", "images"]:
                if key in node_output:
                    for video in node_output[key]:
                        if video.get("subfolder"):
                            local_path = f"./output/{video['subfolder']}/{video['filename']}"
                        else:
                            local_path = f"./output/{video['filename']}"
                        
                        try:
                            s3_url = uploader.upload_file(local_path)
                            output_files.append(s3_url)
                        except Exception as e:
                            print(f"Failed to upload {local_path}: {e}")
        
        return {"status": "completed", "outputs": output_files}
    
    return {"status": "processing"}
@app.post("/generate-image/{scenario_id}/{scene_id}")
async def generate_image(
    scenario_id: str,
    scene_id: int,
    prompt: str = Form(...),
    image: UploadFile = File(...),
    seed: int = Form(42)
):
    """씬 미리보기 이미지 생성 (Flux.2 Klein 4B)"""
    
    # 이미지를 ComfyUI input 폴더에 저장
    comfy_input_dir = Path("./ComfyUI/input")
    comfy_input_dir.mkdir(exist_ok=True)
    image_filename = f"{scenario_id}_scene_{scene_id}_preview_{image.filename}"
    image_path = comfy_input_dir / image_filename
    
    with open(image_path, "wb") as f:
        f.write(await image.read())
    
    # Flux.2 Klein 4B 워크플로우 구성
    workflow = {
        "76": {
            "inputs": {
                "image": image_filename
            },
            "class_type": "LoadImage"
        },
        "75:70": {
            "inputs": {
                "unet_name": "flux-2-klein-base-4b-fp8.safetensors",
                "weight_dtype": "default"
            },
            "class_type": "UNETLoader"
        },
        "75:71": {
            "inputs": {
                "clip_name": "qwen_3_4b.safetensors",
                "type": "flux2",
                "device": "default"
            },
            "class_type": "CLIPLoader"
        },
        "75:72": {
            "inputs": {
                "vae_name": "flux2-vae.safetensors"
            },
            "class_type": "VAELoader"
        },
        "75:74": {
            "inputs": {
                "text": prompt,
                "clip": ["75:71", 0]
            },
            "class_type": "CLIPTextEncode"
        },
        "75:67": {
            "inputs": {
                "text": "",
                "clip": ["75:71", 0]
            },
            "class_type": "CLIPTextEncode"
        },
        "75:80": {
            "inputs": {
                "upscale_method": "nearest-exact",
                "megapixels": 1,
                "resolution_steps": 1,
                "image": ["76", 0]
            },
            "class_type": "ImageScaleToTotalPixels"
        },
        "75:81": {
            "inputs": {
                "image": ["75:80", 0]
            },
            "class_type": "GetImageSize"
        },
        "75:79:78": {
            "inputs": {
                "pixels": ["75:80", 0],
                "vae": ["75:72", 0]
            },
            "class_type": "VAEEncode"
        },
        "75:66": {
            "inputs": {
                "width": ["75:81", 0],
                "height": ["75:81", 1],
                "batch_size": 1
            },
            "class_type": "EmptyFlux2LatentImage"
        },
        "75:79:77": {
            "inputs": {
                "conditioning": ["75:74", 0],
                "latent": ["75:79:78", 0]
            },
            "class_type": "ReferenceLatent"
        },
        "75:79:76": {
            "inputs": {
                "conditioning": ["75:67", 0],
                "latent": ["75:79:78", 0]
            },
            "class_type": "ReferenceLatent"
        },
        "75:73": {
            "inputs": {
                "noise_seed": seed
            },
            "class_type": "RandomNoise"
        },
        "75:61": {
            "inputs": {
                "sampler_name": "euler"
            },
            "class_type": "KSamplerSelect"
        },
        "75:62": {
            "inputs": {
                "steps": 20,
                "width": ["75:81", 0],
                "height": ["75:81", 1]
            },
            "class_type": "Flux2Scheduler"
        },
        "75:63": {
            "inputs": {
                "cfg": 5,
                "model": ["75:70", 0],
                "positive": ["75:79:77", 0],
                "negative": ["75:79:76", 0]
            },
            "class_type": "CFGGuider"
        },
        "75:64": {
            "inputs": {
                "noise": ["75:73", 0],
                "guider": ["75:63", 0],
                "sampler": ["75:61", 0],
                "sigmas": ["75:62", 0],
                "latent_image": ["75:66", 0]
            },
            "class_type": "SamplerCustomAdvanced"
        },
        "75:65": {
            "inputs": {
                "samples": ["75:64", 0],
                "vae": ["75:72", 0]
            },
            "class_type": "VAEDecode"
        },
        "9": {
            "inputs": {
                "filename_prefix": f"preview/{scenario_id}/scene_{scene_id}",
                "images": ["75:65", 0]
            },
            "class_type": "SaveImage"
        }
    }
    
    # ComfyUI 실행
    response = requests.post(f"{COMFYUI_URL}/prompt", json={"prompt": workflow})
    
    if response.status_code != 200:
        return {"error": f"ComfyUI error: {response.text}"}
    
    prompt_id = response.json()["prompt_id"]
    
    return {
        "prompt_id": prompt_id,
        "status": "processing", 
        "scenario_id": scenario_id,
        "scene_id": scene_id,
        "type": "image"
    }

@app.get("/image-status/{scenario_id}/{scene_id}/{prompt_id}")
async def image_status(scenario_id: str, scene_id: int, prompt_id: str):
    """이미지 생성 상태 확인"""
    response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
    history = response.json()
    
    if prompt_id in history and history[prompt_id].get("outputs"):
        # 완료되면 S3 업로드
        output_files = []
        for node_output in history[prompt_id]["outputs"].values():
            if "images" in node_output:
                for img in node_output["images"]:
                    # 로컬 파일 경로
                    if img.get("subfolder"):
                        local_path = f"./ComfyUI/output/{img['subfolder']}/{img['filename']}"
                    else:
                        local_path = f"./ComfyUI/output/{img['filename']}"
                    
                    try:
                        # S3 업로드 (미리보기 이미지)
                        s3_key = f"preview/{scenario_id}/scene_{scene_id}.png"
                        s3_url = uploader.upload_file_with_key(local_path, s3_key)
                        output_files.append(s3_url)
                        print(f"Preview image uploaded: {s3_url}")
                        
                    except Exception as e:
                        print(f"Failed to upload preview image {local_path}: {e}")
        
        return {"status": "completed", "outputs": output_files, "type": "image"}
    
    return {"status": "processing", "type": "image"}
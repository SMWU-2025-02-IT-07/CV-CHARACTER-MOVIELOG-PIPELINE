from fastapi import FastAPI, File, UploadFile, Form
from s3_uploader import S3Uploader
import requests
import uuid
import os
from pathlib import Path

app = FastAPI()
uploader = S3Uploader()

COMFYUI_URL = "http://localhost:8188"

@app.post("/generate")
async def generate(
    prompt: str = Form(...),
    image: UploadFile = File(...),
    frame_count: int = Form(113),
    seed: int = Form(10)
):
    # 이미지 저장
    input_dir = Path("./input")
    input_dir.mkdir(exist_ok=True)
    image_path = input_dir / f"{uuid.uuid4()}_{image.filename}"
    
    with open(image_path, "wb") as f:
        f.write(await image.read())
    
    # 워크플로우 구성
    workflow = {
        "98": {"inputs": {"image": str(image_path.name)}},
        "92": {"inputs": {"text": prompt, "value": frame_count, "noise_seed": seed}}
    }
    
    # ComfyUI 실행
    response = requests.post(f"{COMFYUI_URL}/prompt", json={"prompt": workflow})
    prompt_id = response.json()["prompt_id"]
    
    return {"prompt_id": prompt_id, "status": "processing"}

@app.get("/status/{prompt_id}")
async def status(prompt_id: str):
    response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
    history = response.json()
    
    if prompt_id in history and history[prompt_id].get("outputs"):
        # 완료되면 S3 업로드
        output_files = []
        for node_output in history[prompt_id]["outputs"].values():
            if "videos" in node_output:
                for video in node_output["videos"]:
                    local_path = f"./output/{video['filename']}"
                    s3_url = uploader.upload_file(local_path)
                    output_files.append(s3_url)
        
        return {"status": "completed", "outputs": output_files}
    
    return {"status": "processing"}

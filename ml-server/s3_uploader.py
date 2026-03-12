import boto3
import os
from pathlib import Path
import requests

class S3Uploader:
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.bucket = os.getenv('S3_BUCKET_NAME', 'cv-character-movielog-pipeline')
        self.prefix = os.getenv('S3_PREFIX', 'outputs/')
        self.webhook_url = os.getenv('FRONTEND_WEBHOOK_URL')
    
    def upload_file_with_key(self, local_path, s3_key):
        """지정된 S3 키로 파일 업로드"""
        # 파일 경로 확인 및 수정
        if not os.path.exists(local_path):
            # ./output/ 경로가 없으면 ./ComfyUI/output/ 시도
            if local_path.startswith('./output/'):
                local_path = local_path.replace('./output/', './ComfyUI/output/')
        
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"File not found: {local_path}")
            
        self.s3.upload_file(local_path, self.bucket, s3_key)
        # HTTPS URL로 반환 (프론트에서 재생 가능)
        s3_url = f"https://{self.bucket}.s3.amazonaws.com/{s3_key}"
        
        # 프론트로 웹훅 전송
        if self.webhook_url:
            requests.post(self.webhook_url, json={"video_url": s3_url})
        
        return s3_url
    
    def upload_file(self, local_path, s3_key=None):
        if not s3_key:
            s3_key = f"{self.prefix}{Path(local_path).name}"
        
        self.s3.upload_file(local_path, self.bucket, s3_key)
        # HTTPS URL로 반환 (프론트에서 재생 가능)
        s3_url = f"https://{self.bucket}.s3.amazonaws.com/{s3_key}"
        
        # 프론트로 웹훅 전송
        if self.webhook_url:
            requests.post(self.webhook_url, json={"video_url": s3_url})
        
        return s3_url

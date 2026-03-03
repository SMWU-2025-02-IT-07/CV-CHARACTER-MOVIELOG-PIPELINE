import boto3
import os
from pathlib import Path
import requests

class S3Uploader:
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.bucket = os.getenv('S3_BUCKET_NAME')
        self.prefix = os.getenv('S3_PREFIX', 'outputs/')
        self.webhook_url = os.getenv('FRONTEND_WEBHOOK_URL')
    
    def upload_file(self, local_path, s3_key=None):
        if not s3_key:
            s3_key = f"{self.prefix}{Path(local_path).name}"
        
        self.s3.upload_file(local_path, self.bucket, s3_key)
        s3_url = f"s3://{self.bucket}/{s3_key}"
        
        # 프론트로 웹훅 전송
        if self.webhook_url:
            requests.post(self.webhook_url, json={"video_url": s3_url})
        
        return s3_url

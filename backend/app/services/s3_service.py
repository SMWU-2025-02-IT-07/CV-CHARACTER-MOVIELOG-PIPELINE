import boto3
import base64
import json
from datetime import datetime
from app.core.config import settings
from app.core.errors import AppError

s3_client = boto3.client('s3', region_name=settings.s3_region)

def upload_scenario_to_s3(scenario_id: str, scenario_data: dict) -> str:
    """
    시나리오 데이터를 S3에 업로드
    
    Args:
        scenario_id: 시나리오 ID
        scenario_data: 시나리오 전체 데이터
    
    Returns:
        S3 URL
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"scenarios/{timestamp}_{scenario_id}.json"
        
        s3_client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key,
            Body=json.dumps(scenario_data, ensure_ascii=False, indent=2),
            ContentType='application/json'
        )
        
        s3_url = f"https://{settings.s3_bucket_name}.s3.{settings.s3_region}.amazonaws.com/{s3_key}"
        print(f"시나리오 S3 업로드 완료: {s3_url}")
        return s3_url
        
    except Exception as e:
        print(f"S3 업로드 실패: {e}")
        return ""

def upload_image_to_s3(image_base64: str, scene_id: int, scenario_id: str) -> str:
    """
    씬 이미지를 S3에 업로드
    
    Args:
        image_base64: base64 이미지 데이터
        scene_id: 씬 ID
        scenario_id: 시나리오 ID
    
    Returns:
        S3 URL
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"images/{timestamp}_{scenario_id}_scene_{scene_id}.png"
        
        # base64 디코딩
        image_data = base64.Zb64decode(image_base64)
        
        s3_client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key,
            Body=image_data,
            ContentType='image/png'
        )
        
        s3_url = f"https://{settings.s3_bucket_name}.s3.{settings.s3_region}.amazonaws.com/{s3_key}"
        print(f"이미지 S3 업로드 완료: {s3_url}")
        return s3_url
        
    except Exception as e:
        print(f"이미지 S3 업로드 실패: {e}")
        return ""

def upload_video_to_s3(video_path: str, scene_id: int, scenario_id: str) -> str:
    """
    씬 비디오를 S3에 업로드
    
    Args:
        video_path: 로컬 비디오 파일 경로
        scene_id: 씬 ID
        scenario_id: 시나리오 ID
    
    Returns:
        S3 URL
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"videos/{timestamp}_{scenario_id}_scene_{scene_id}.mp4"
        
        with open(video_path, 'rb') as video_file:
            s3_client.put_object(
                Bucket=settings.s3_bucket_name,
                Key=s3_key,
                Body=video_file.read(),
                ContentType='video/mp4'
            )
        
        s3_url = f"https://{settings.s3_bucket_name}.s3.{settings.s3_region}.amazonaws.com/{s3_key}"
        print(f"비디오 S3 업로드 완료: {s3_url}")
        return s3_url
        
    except Exception as e:
        print(f"비디오 S3 업로드 실패: {e}")
        return ""
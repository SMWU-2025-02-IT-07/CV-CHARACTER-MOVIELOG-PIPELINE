"""
비디오 병합 서비스 (ML 서버용)
"""
import os
import json
import subprocess
import tempfile
import requests
from pathlib import Path
from typing import List, Dict
import boto3
from s3_uploader import S3Uploader

uploader = S3Uploader()

# 병합 상태 저장 (메모리)
merge_status = {}

def download_audio_file(scenario_id: str, temp_dir: str) -> str:
    """S3에서 오디오 파일 다운로드"""
    try:
        s3 = boto3.client('s3')
        bucket = os.getenv('S3_BUCKET_NAME', 'comfyui-ml-v2-videos-c8f7625e')
        
        response = s3.list_objects_v2(
            Bucket=bucket,
            Prefix=f"audio/{scenario_id}/"
        )
        
        if 'Contents' not in response:
            print(f"No audio file found for scenario {scenario_id}")
            return None
        
        audio_files = [
            obj['Key'] for obj in response['Contents']
            if obj['Key'].endswith(('.mp3', '.wav', '.aac', '.m4a', '.flac'))
        ]
        
        if not audio_files:
            print(f"No audio file found for scenario {scenario_id}")
            return None
        
        # 첫 번째 오디오 파일 다운로드
        s3_key = audio_files[0]
        local_file = Path(temp_dir) / Path(s3_key).name
        
        print(f"Downloading audio: {s3_key}")
        s3.download_file(bucket, s3_key, str(local_file))
        
        return str(local_file)
        
    except Exception as e:
        print(f"Error downloading audio file: {e}")
        return None

def merge_video_with_audio(video_file: str, audio_file: str, output_file: str, ffmpeg_path: str = 'ffmpeg') -> bool:
    """비디오와 오디오를 병합"""
    try:
        cmd = [
            ffmpeg_path,
            '-i', video_file,
            '-i', audio_file,
            '-c:v', 'copy',      # 비디오는 재인코딩 없이 복사
            '-c:a', 'aac',       # 오디오는 AAC로 인코딩
            '-b:a', '192k',
            '-map', '0:v:0',     # 첫 번째 입력의 비디오
            '-map', '1:a:0',     # 두 번째 입력의 오디오
            '-shortest',         # 짧은 쪽에 맞춤
            '-y',
            output_file
        ]
        
        print(f"FFmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            print(f"Video-audio merge successful: {output_file}")
            return True
        else:
            print(f"FFmpeg error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"Error merging video with audio: {e}")
        return False

def download_video_from_url(video_url: str, output_path: str) -> bool:
    """URL에서 비디오 파일 다운로드"""
    try:
        print(f"비디오 다운로드 시작: {video_url}")
        response = requests.get(video_url, stream=True, timeout=30)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        file_size = os.path.getsize(output_path)
        print(f"비디오 다운로드 완료: {output_path} ({file_size} bytes)")
        return True
        
    except Exception as e:
        print(f"비디오 다운로드 실패 {video_url}: {e}")
        return False


def create_ffmpeg_concat_file(video_files: List[str], concat_file_path: str) -> None:
    """FFmpeg concat 파일 생성 (절대 경로 사용)"""
    try:
        print(f"FFmpeg concat 파일 생성: {concat_file_path}")
        with open(concat_file_path, 'w', encoding='utf-8') as f:
            for video_file in video_files:
                # 절대 경로로 변환 후 Unix 스타일로 변경
                abs_path = Path(video_file).resolve().as_posix()
                f.write(f"file '{abs_path}'\n")
        
        print(f"Concat 파일 내용:")
        with open(concat_file_path, 'r', encoding='utf-8') as f:
            print(f.read())
            
    except Exception as e:
        print(f"Concat 파일 생성 실패: {e}")
        raise


def merge_videos_with_ffmpeg(video_files: List[str], output_path: str, ffmpeg_path: str = 'ffmpeg') -> bool:
    """FFmpeg를 사용해서 비디오 병합 (오디오 없음)"""
    try:
        print(f"\n=== FFmpeg 비디오 병합 시작 ===")
        print(f"입력 파일 수: {len(video_files)}")
        print(f"출력 파일: {output_path}")
        
        # 임시 concat 파일 생성
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as concat_file:
            concat_file_path = concat_file.name
            
        create_ffmpeg_concat_file(video_files, concat_file_path)
        
        # FFmpeg 명령어 구성
        ffmpeg_cmd = [
            ffmpeg_path,
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_file_path,
            '-c:v', 'libx264',  # 비디오 코덱
            '-c:a', 'aac',      # 오디오 코덱
            '-b:a', '192k',     # 오디오 비트레이트
            '-preset', 'fast',
            '-y',  # 출력 파일 덮어쓰기
            output_path
        ]
        
        print(f"FFmpeg 명령어: {' '.join(ffmpeg_cmd)}")
        
        # FFmpeg 실행
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5분 타임아웃
        )
        
        # 임시 파일 정리
        try:
            os.unlink(concat_file_path)
        except:
            pass
        
        if result.returncode == 0:
            output_size = os.path.getsize(output_path)
            print(f"비디오 병합 성공: {output_path} ({output_size} bytes)")
            return True
        else:
            print(f"FFmpeg 에러 (return code: {result.returncode}):")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"FFmpeg 타임아웃 (5분 초과)")
        return False
    except Exception as e:
        print(f"비디오 병합 중 오류: {e}")
        import traceback
        print(traceback.format_exc())
        return False


def get_scenario_from_s3(scenario_id: str) -> Dict:
    """S3에서 시나리오 메타데이터 가져오기"""
    try:
        s3_url = f"https://comfyui-ml-v2-videos-c8f7625e.s3.ap-northeast-2.amazonaws.com/scenarios/{scenario_id}/metadata.json"
        
        print(f"S3에서 시나리오 로드: {s3_url}")
        response = requests.get(s3_url, timeout=10)
        
        if response.status_code != 200:
            raise Exception(f"S3 로드 실패: {response.status_code}")
        
        return response.json()
        
    except Exception as e:
        print(f"S3에서 시나리오 로드 실패: {e}")
        raise


def merge_scenario_videos(scenario_id: str) -> Dict:
    """시나리오의 모든 씬 비디오를 병합하고 오디오 추가"""
    print(f"\n=== 시나리오 비디오 병합 시작: {scenario_id} ===")
    
    ffmpeg_path = os.getenv('FFMPEG_PATH', 'ffmpeg')
    
    # 상태 초기화
    merge_status[scenario_id] = {
        "status": "processing",
        "message": "병합 시작",
        "progress": 0
    }
    
    try:
        # S3에서 시나리오 정보 가져오기
        scenario = get_scenario_from_s3(scenario_id)
        scenes = scenario.get("scenes", [])
        
        print(f"시나리오 로드 완료: {len(scenes)}개 씬")
        
        # 비디오 URL이 있는 씬들만 필터링
        scenes_with_video = []
        for scene in scenes:
            video_url = scene.get("video_url")
            if video_url:
                scenes_with_video.append({
                    "id": scene.get("id"),
                    "video_url": video_url
                })
                print(f"씬 {scene.get('id')}: {video_url}")
            else:
                print(f"씬 {scene.get('id')}: 비디오 URL 없음 (건너뛰기)")
        
        if not scenes_with_video:
            merge_status[scenario_id] = {
                "status": "failed",
                "message": "병합할 비디오가 없습니다",
                "progress": 0
            }
            return merge_status[scenario_id]
        
        print(f"병합할 씬 수: {len(scenes_with_video)}")
        merge_status[scenario_id]["message"] = f"{len(scenes_with_video)}개 씬 병합 중"
        merge_status[scenario_id]["progress"] = 10
        
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            print(f"임시 디렉토리: {temp_path}")
            
            # 각 씬의 비디오 다운로드
            downloaded_files = []
            total_scenes = len(scenes_with_video)
            
            for i, scene in enumerate(scenes_with_video):
                scene_id = scene["id"]
                video_url = scene["video_url"]
                video_filename = f"scene_{scene_id:03d}.mp4"
                video_path = temp_path / video_filename
                
                print(f"\n씬 {scene_id} 비디오 다운로드 중... ({i+1}/{total_scenes})")
                
                if download_video_from_url(video_url, str(video_path)):
                    downloaded_files.append(str(video_path))
                    print(f"다운로드 성공: {video_path}")
                    
                    # 진행률 업데이트 (10% ~ 40%)
                    progress = 10 + int((i + 1) / total_scenes * 30)
                    merge_status[scenario_id]["progress"] = progress
                else:
                    print(f"다운로드 실패: 씬 {scene_id} 건너뛰기")
            
            if not downloaded_files:
                merge_status[scenario_id] = {
                    "status": "failed",
                    "message": "모든 비디오 다운로드 실패",
                    "progress": 0
                }
                return merge_status[scenario_id]
            
            print(f"\n다운로드 완료된 파일 수: {len(downloaded_files)}")
            merge_status[scenario_id]["message"] = "비디오 병합 중"
            merge_status[scenario_id]["progress"] = 40
            
            # 1단계: 비디오들 병합 (오디오 없음)
            merged_no_audio = temp_path / "merged_no_audio.mp4"
            print(f"\n1단계: 비디오 병합 시작...")
            
            if not merge_videos_with_ffmpeg(downloaded_files, str(merged_no_audio), ffmpeg_path):
                merge_status[scenario_id] = {
                    "status": "failed",
                    "message": "비디오 병합 실패",
                    "progress": 40
                }
                return merge_status[scenario_id]
            
            print(f"비디오 병합 성공: {merged_no_audio}")
            merge_status[scenario_id]["progress"] = 60
            
            # 2단계: 오디오 파일 다운로드
            print(f"\n2단계: 오디오 다운로드...")
            audio_file = download_audio_file(scenario_id, temp_dir)
            
            final_video_path = temp_path / f"final_{scenario_id}.mp4"
            
            if audio_file:
                # 오디오가 있으면 비디오와 병합
                print(f"\n3단계: 비디오 + 오디오 병합...")
                merge_status[scenario_id]["message"] = "비디오 + 오디오 병합 중"
                merge_status[scenario_id]["progress"] = 70
                
                if not merge_video_with_audio(str(merged_no_audio), audio_file, str(final_video_path), ffmpeg_path):
                    merge_status[scenario_id] = {
                        "status": "failed",
                        "message": "비디오-오디오 병합 실패",
                        "progress": 70
                    }
                    return merge_status[scenario_id]
                
                print(f"비디오-오디오 병합 성공: {final_video_path}")
            else:
                # 오디오가 없으면 비디오만 사용
                print(f"오디오 파일 없음, 비디오만 사용")
                Path(merged_no_audio).rename(final_video_path)
            
            merge_status[scenario_id]["progress"] = 80
            
            # S3에 최종 비디오 업로드
            print(f"\nS3에 최종 비디오 업로드 중...")
            merge_status[scenario_id]["message"] = "S3 업로드 중"
            
            try:
                s3_key = f"final_videos/{scenario_id}.mp4"
                final_video_url = uploader.upload_file_with_key(str(final_video_path), s3_key)
                print(f"S3 업로드 성공: {final_video_url}")
                
                merge_status[scenario_id] = {
                    "status": "completed",
                    "message": "Video merge completed successfully",
                    "final_video_url": final_video_url,
                    "scene_count": len(downloaded_files),
                    "merged_scenes": [s["id"] for s in scenes_with_video if any(f"scene_{s['id']:03d}" in f for f in downloaded_files)],
                    "has_audio": audio_file is not None,
                    "progress": 100
                }
                
                return merge_status[scenario_id]
                
            except Exception as e:
                print(f"S3 업로드 실패: {e}")
                merge_status[scenario_id] = {
                    "status": "failed",
                    "message": f"S3 업로드 실패: {str(e)}",
                    "progress": 80
                }
                return merge_status[scenario_id]
                
    except Exception as e:
        print(f"비디오 병합 중 예상치 못한 오류: {e}")
        import traceback
        print(traceback.format_exc())
        
        merge_status[scenario_id] = {
            "status": "failed",
            "message": f"비디오 병합 오류: {str(e)}",
            "progress": 0
        }
        return merge_status[scenario_id]


def get_merge_status(scenario_id: str) -> Dict:
    """병합 상태 조회"""
    return merge_status.get(scenario_id, {
        "status": "not_found",
        "message": "병합 작업을 찾을 수 없습니다",
        "progress": 0
    })

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
    """FFmpeg concat 파일 생성"""
    try:
        print(f"FFmpeg concat 파일 생성: {concat_file_path}")
        with open(concat_file_path, 'w', encoding='utf-8') as f:
            for video_file in video_files:
                # 경로를 FFmpeg가 인식할 수 있도록 변환
                ffmpeg_path = video_file.replace('\\', '/')
                f.write(f"file '{ffmpeg_path}'\n")  # \n이 아니라 실제 줄바꿈
        
        print(f"Concat 파일 내용:")
        with open(concat_file_path, 'r', encoding='utf-8') as f:
            print(f.read())
            
    except Exception as e:
        print(f"Concat 파일 생성 실패: {e}")
        raise


def merge_videos_with_ffmpeg(video_files: List[str], output_path: str) -> bool:
    """FFmpeg를 사용해서 비디오 병합"""
    try:
        print(f"\\n=== FFmpeg 비디오 병합 시작 ===")
        print(f"입력 파일 수: {len(video_files)}")
        print(f"출력 파일: {output_path}")
        
        # 임시 concat 파일 생성
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as concat_file:
            concat_file_path = concat_file.name
            
        create_ffmpeg_concat_file(video_files, concat_file_path)
        
        # FFmpeg 명령어 구성
        ffmpeg_cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_file_path,
            '-c', 'copy',  # 재인코딩 없이 복사
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
    """시나리오의 모든 씬 비디오를 병합"""
    print(f"\\n=== 시나리오 비디오 병합 시작: {scenario_id} ===")
    
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
        
        if len(scenes_with_video) == 1:
            print(f"씬이 1개뿐이므로 병합 없이 원본 비디오 사용")
            merge_status[scenario_id] = {
                "status": "completed",
                "message": "Single scene, no merge needed",
                "final_video_url": scenes_with_video[0]["video_url"],
                "scene_count": 1,
                "progress": 100
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
                
                print(f"\\n씬 {scene_id} 비디오 다운로드 중... ({i+1}/{total_scenes})")
                
                if download_video_from_url(video_url, str(video_path)):
                    downloaded_files.append(str(video_path))
                    print(f"다운로드 성공: {video_path}")
                    
                    # 진행률 업데이트 (10% ~ 60%)
                    progress = 10 + int((i + 1) / total_scenes * 50)
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
            
            print(f"\\n다운로드 완료된 파일 수: {len(downloaded_files)}")
            merge_status[scenario_id]["message"] = "비디오 병합 중"
            merge_status[scenario_id]["progress"] = 60
            
            # 비디오 병합
            final_video_path = temp_path / f"final_{scenario_id}.mp4"
            print(f"\\n비디오 병합 시작...")
            
            if merge_videos_with_ffmpeg(downloaded_files, str(final_video_path)):
                print(f"비디오 병합 성공: {final_video_path}")
                merge_status[scenario_id]["progress"] = 80
                
                # S3에 최종 비디오 업로드
                print(f"\\nS3에 최종 비디오 업로드 중...")
                merge_status[scenario_id]["message"] = "S3 업로드 중"
                
                try:
                    s3_key = f"videos/{scenario_id}/final.mp4"
                    final_video_url = uploader.upload_file_with_key(str(final_video_path), s3_key)
                    print(f"S3 업로드 성공: {final_video_url}")
                    
                    merge_status[scenario_id] = {
                        "status": "completed",
                        "message": "Video merge completed successfully",
                        "final_video_url": final_video_url,
                        "scene_count": len(downloaded_files),
                        "merged_scenes": [s["id"] for s in scenes_with_video if any(f"scene_{s['id']:03d}" in f for f in downloaded_files)],
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
            else:
                merge_status[scenario_id] = {
                    "status": "failed",
                    "message": "비디오 병합 실패",
                    "progress": 60
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

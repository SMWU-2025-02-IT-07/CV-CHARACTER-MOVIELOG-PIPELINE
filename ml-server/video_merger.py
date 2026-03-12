import boto3
import os
import subprocess
from pathlib import Path
import tempfile
from s3_uploader import S3Uploader

class VideoMerger:
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.bucket = os.getenv('S3_BUCKET_NAME', 'cv-character-movielog-pipeline')
        self.uploader = S3Uploader()
    
    def merge_scenario_videos(self, scenario_id):
        """시나리오의 모든 비디오를 병합하여 최종 영상 생성"""
        try:
            # S3에서 해당 시나리오의 모든 비디오 파일 목록 가져오기
            video_files = self._get_scenario_videos(scenario_id)
            
            if not video_files:
                return {"error": "No videos found for scenario"}
            
            # 임시 디렉토리에 비디오 다운로드
            with tempfile.TemporaryDirectory() as temp_dir:
                local_files = []
                
                # S3에서 비디오 파일들 다운로드
                for i, s3_key in enumerate(sorted(video_files)):
                    local_file = Path(temp_dir) / f"scene_{i+1}.mp4"
                    self.s3.download_file(self.bucket, s3_key, str(local_file))
                    local_files.append(str(local_file))
                
                # FFmpeg로 비디오 병합
                merged_file = Path(temp_dir) / f"{scenario_id}_merged.mp4"
                success = self._merge_videos_with_ffmpeg(local_files, str(merged_file))
                
                if success:
                    # 병합된 비디오를 S3에 업로드
                    final_s3_key = f"final_videos/{scenario_id}.mp4"
                    final_url = self.uploader.upload_file_with_key(str(merged_file), final_s3_key)
                    
                    return {
                        "status": "success",
                        "final_video_url": final_url,
                        "scenario_id": scenario_id
                    }
                else:
                    return {"error": "Video merge failed"}
                    
        except Exception as e:
            return {"error": f"Merge failed: {str(e)}"}
    
    def _get_scenario_videos(self, scenario_id):
        """S3에서 특정 시나리오의 비디오 파일 목록 가져오기"""
        try:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=f"videos/{scenario_id}/"
            )
            
            video_files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    if obj['Key'].endswith('.mp4'):
                        video_files.append(obj['Key'])
            
            return video_files
        except Exception as e:
            print(f"Error getting scenario videos: {e}")
            return []
    
    def _merge_videos_with_ffmpeg(self, video_files, output_file):
        """FFmpeg를 사용하여 비디오 파일들을 병합"""
        try:
            # 파일 목록을 텍스트 파일로 생성
            file_list_path = Path(output_file).parent / "file_list.txt"
            with open(file_list_path, 'w') as f:
                for video_file in video_files:
                    f.write(f"file '{video_file}'\n")
            
            # FFmpeg 명령어 실행
            cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', str(file_list_path),
                '-c', 'copy',
                '-y',  # 덮어쓰기
                str(output_file)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"Video merge successful: {output_file}")
                return True
            else:
                print(f"FFmpeg error: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"Error merging videos: {e}")
            return False
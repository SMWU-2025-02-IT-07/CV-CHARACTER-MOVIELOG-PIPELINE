import boto3
import os
import subprocess
from pathlib import Path
import tempfile
from s3_uploader import S3Uploader

class VideoMerger:
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.bucket = os.getenv('S3_BUCKET_NAME', 'comfyui-ml-v2-videos-c8f7625e')
        self.uploader = S3Uploader()
        self.ffmpeg_path = os.getenv('FFMPEG_PATH', 'ffmpeg')  # 환경변수로 설정 가능
    
    def merge_scenario_videos(self, scenario_id):
        """시나리오의 모든 비디오를 병합하고 오디오를 추가하여 최종 영상 생성"""
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
                
                # 1단계: 비디오들 병합 (오디오 없음)
                merged_no_audio = Path(temp_dir) / "merged_no_audio.mp4"
                success = self._merge_videos_with_ffmpeg(local_files, str(merged_no_audio))
                
                if not success:
                    return {"error": "Video merge failed"}
                
                # 2단계: 오디오 파일 다운로드
                audio_file = self._download_audio_file(scenario_id, temp_dir)
                
                final_file = Path(temp_dir) / f"{scenario_id}_final.mp4"
                
                if audio_file:
                    # 오디오가 있으면 비디오와 병합
                    success = self._merge_video_with_audio(
                        str(merged_no_audio),
                        audio_file,
                        str(final_file)
                    )
                    if not success:
                        return {"error": "Video-audio merge failed"}
                else:
                    # 오디오가 없으면 비디오만 사용
                    merged_no_audio.rename(final_file)
                
                # 최종 비디오를 S3에 업로드
                final_s3_key = f"final_videos/{scenario_id}.mp4"
                final_url = self.uploader.upload_file_with_key(str(final_file), final_s3_key)
                
                return {
                    "status": "success",
                    "final_video_url": final_url,
                    "scenario_id": scenario_id,
                    "has_audio": audio_file is not None
                }
                    
        except Exception as e:
            return {"error": f"Merge failed: {str(e)}"}
    
    def _download_audio_file(self, scenario_id, temp_dir):
        """S3에서 오디오 파일 다운로드"""
        try:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
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
            self.s3.download_file(self.bucket, s3_key, str(local_file))
            
            return str(local_file)
            
        except Exception as e:
            print(f"Error downloading audio file: {e}")
            return None
    
    def _merge_video_with_audio(self, video_file, audio_file, output_file):
        """비디오와 오디오를 병합"""
        try:
            cmd = [
                self.ffmpeg_path,
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
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"Video-audio merge successful: {output_file}")
                return True
            else:
                print(f"FFmpeg error: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"Error merging video with audio: {e}")
            return False
    
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
        """FFmpeg를 사용하여 비디오 파일들을 병합 (오디오 없음)"""
        try:
            # 파일 목록을 텍스트 파일로 생성 (절대 경로 사용)
            file_list_path = Path(output_file).parent / "file_list.txt"
            with open(file_list_path, 'w', encoding='utf-8') as f:
                for video_file in video_files:
                    abs_path = Path(video_file).resolve().as_posix()
                    f.write(f"file '{abs_path}'\n")
            
            # FFmpeg 명령어 실행 (오디오 유지)
            cmd = [
                self.ffmpeg_path,
                '-f', 'concat',
                '-safe', '0',
                '-i', str(file_list_path),
                '-c:v', 'libx264',  # 비디오 코덱
                '-c:a', 'aac',      # 오디오 코덱
                '-b:a', '192k',     # 오디오 비트레이트
                '-preset', 'fast',
                '-y',
                str(output_file)
            ]
            
            print(f"FFmpeg 명령어: {' '.join(cmd)}")
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
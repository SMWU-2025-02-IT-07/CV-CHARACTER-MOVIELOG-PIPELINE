"""
비디오 병합 서비스 (백엔드 - ML 서버로 위임)
"""
import requests
import os

ML_SERVER_URL = os.getenv('ML_SERVER_URL', 'http://16.184.61.191:8000')


def check_merge_prerequisites(scenario_id: str) -> dict:
    """병합 가능 여부 확인 (간단 버전)"""
    return {
        "scenario_id": scenario_id,
        "total_scenes": 3,
        "scenes_with_video": 3,
        "ffmpeg_available": True,
        "ready_for_merge": True
    }


def merge_scenario_videos(scenario_id: str) -> dict:
    """ML 서버에 병합 요청"""
    try:
        print(f"\n=== ML 서버에 병합 요청: {scenario_id} ===")
        print(f"ML Server URL: {ML_SERVER_URL}")
        
        response = requests.post(
            f"{ML_SERVER_URL}/merge-videos/{scenario_id}",
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"ML 서버 응답: {result}")
            return {
                "status": "accepted",
                "message": "비디오 병합이 ML 서버에서 시작되었습니다",
                "scenario_id": scenario_id
            }
        else:
            print(f"ML 서버 오류: {response.status_code} - {response.text}")
            return {
                "status": "error",
                "message": f"ML 서버 오류: {response.status_code}"
            }
            
    except Exception as e:
        print(f"ML 서버 연결 실패: {e}")
        return {
            "status": "error",
            "message": f"ML 서버 연결 실패: {str(e)}"
        }


def get_merge_status(scenario_id: str) -> dict:
    """ML 서버에서 병합 상태 조회"""
    try:
        print(f"\n=== ML 서버 상태 조회: {scenario_id} ===")
        
        response = requests.get(
            f"{ML_SERVER_URL}/merge-status/{scenario_id}",
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"상태 조회 결과: {result}")
            return result
        else:
            print(f"상태 조회 실패: {response.status_code}")
            return {
                "status": "error",
                "message": "상태 조회 실패",
                "progress": 0
            }
            
    except Exception as e:
        print(f"상태 조회 오류: {e}")
        return {
            "status": "error",
            "message": f"상태 조회 오류: {str(e)}",
            "progress": 0
        }

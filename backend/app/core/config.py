from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Bedrock 설정
    aws_region: str = "ap-northeast-2"
    bedrock_model_id: str = "apac.anthropic.claude-3-haiku-20240307-v1:0"
    use_bedrock: bool = True
    
    # OpenAI 설정 (fallback)
    openai_api_key: str = ""
    openai_model: str = "gpt-4"
    
    # S3 설정
    s3_bucket_name: str = "comfyui-ml-v2-videos-c8f7625e"
    s3_region: str = "ap-northeast-2"
    
    # 기타 설정
    cors_origins: str = "http://localhost:3000"
    scenarios_dir: str = str((Path(__file__).resolve().parents[2] / "data" / "scenarios"))

    @property
    def cors_origins_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
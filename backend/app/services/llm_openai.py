from app.core.config import settings

if settings.use_bedrock and settings.openai_api_key:
    from app.services.llm_bedrock import generate_scenes_json
else:
    from app.services.llm_openai_original import generate_scenes_json

__all__ = ["generate_scenes_json"]

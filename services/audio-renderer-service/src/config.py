from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "audio_renderer"
    AZURE_SPEECH_KEY: str = ""
    AZURE_SPEECH_REGION: str = "eastus"
    AUDIO_STORAGE_PATH: str = "tts-storage"
    AUDIO_BASE_URL: str = "/audio"

    API_TITLE: str = "Audio Renderer Service"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Batch TTS audio generation engine"

    HOST: str = "0.0.0.0"
    PORT: int = 8080
    DEBUG: bool = False


settings = Settings()

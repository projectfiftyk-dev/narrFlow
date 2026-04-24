from pydantic import BaseModel


class Voice(BaseModel):
    id: str
    slug: str
    friendlyName: str
    description: str = ""


class VoiceUpdate(BaseModel):
    slug: str | None = None
    friendlyName: str | None = None
    description: str | None = None



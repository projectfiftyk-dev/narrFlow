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


HARDCODED_VOICES: list[Voice] = [
    Voice(
        id="en-US-JennyNeural",
        slug="calm_female",
        friendlyName="Calm Female Narrator",
        description="Soft, neutral female narration voice",
    ),
    Voice(
        id="en-US-GuyNeural",
        slug="deep_male",
        friendlyName="Deep Male Narrator",
        description="Low, authoritative male voice",
    ),
    Voice(
        id="en-US-AriaNeural",
        slug="expressive_female",
        friendlyName="Expressive Female",
        description="Warm, expressive female voice suited for storytelling",
    ),
    Voice(
        id="en-US-DavisNeural",
        slug="casual_male",
        friendlyName="Casual Male",
        description="Friendly, casual male voice",
    ),
]

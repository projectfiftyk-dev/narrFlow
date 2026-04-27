from pydantic import BaseModel


class VoiceTestSample(BaseModel):
    language: str
    url: str


class Voice(BaseModel):
    id: str
    slug: str
    friendlyName: str
    description: str = ""
    tests: list[VoiceTestSample] = []


class VoiceUpdate(BaseModel):
    slug: str | None = None
    friendlyName: str | None = None
    description: str | None = None


CURATED_VOICES: list[Voice] = [
    Voice(id="EXAVITQu4vr4xnSDxMaL", slug="sarah",     friendlyName="Sarah",     description="Soft, young adult female"),
    Voice(id="pFZP5JQG7iQjIQuC4Bku", slug="lily",      friendlyName="Lily",      description="Warm, expressive female"),
    Voice(id="pNInz6obpgDQGcFmaJgB", slug="adam",      friendlyName="Adam",      description="Deep, middle-aged male"),
    Voice(id="ErXwobaYiN019PkySvjV", slug="antoni",    friendlyName="Antoni",    description="Well-rounded, young adult male"),
    Voice(id="IKne3meq5aSn9XLyUdCD", slug="charlie",   friendlyName="Charlie",   description="Casual, middle-aged male"),
]



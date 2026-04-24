import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URL)
        logger.info("MongoDB client created: %s / %s", settings.MONGODB_URL, settings.MONGODB_DB_NAME)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.MONGODB_DB_NAME]


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("MongoDB client closed")

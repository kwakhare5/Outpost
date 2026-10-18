from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from backend.config import settings

connect_args = {}
if "postgres" in settings.DATABASE_URL.lower():
    connect_args = {"server_settings": {"timezone": "UTC"}}

async_engine = create_async_engine(settings.DATABASE_URL, connect_args=connect_args)
async_session_factory = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session

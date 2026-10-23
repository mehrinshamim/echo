from dataclasses import dataclass

from fastapi import Header, HTTPException
from supabase import AsyncClient, acreate_client
from supabase_auth.errors import AuthError

from app.config import settings


@dataclass
class User:
    id: str
    db: AsyncClient  # queries run as this user, so RLS limits them to their own rows


async def get_user(authorization: str | None = Header(None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.removeprefix("Bearer ")

    # One client per request: the token is attached to it, so requests never share a user
    db = await acreate_client(settings.supabase_url, settings.supabase_anon_key)
    try:
        res = await db.auth.get_user(token)
    except AuthError:
        res = None
    if not res or not res.user:
        raise HTTPException(401, "Invalid or expired token")

    db.postgrest.auth(token)
    return User(id=res.user.id, db=db)

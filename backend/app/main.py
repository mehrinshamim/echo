from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.deps import User, get_user
from app.routes import chats, home, logs, themes

app = FastAPI(title="Echo API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(logs.router)
app.include_router(home.router)
app.include_router(themes.router)
app.include_router(chats.router)


@app.get("/health")
async def health():
    return {"ok": True}


@app.get("/me")
async def me(user: User = Depends(get_user)):
    return {"user_id": user.id}

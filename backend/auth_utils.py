import os
import jwt
import base64
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from database import supabase

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

try:
    # Supabase JWT secrets are base64-encoded
    signing_key = base64.b64decode(SUPABASE_JWT_SECRET)
except Exception:
    signing_key = SUPABASE_JWT_SECRET

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def decode_supabase_token(token: str) -> dict | None:
    """Decode and verify a Supabase-issued JWT."""
    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase tokens have audience "authenticated"
        )
        return payload
    except jwt.PyJWTError as e:
        print("JWT Decode Error:", e)
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    FastAPI dependency: validates the Supabase JWT and returns the user_id (UUID).
    The token is issued by Supabase Auth on the frontend and passed as Bearer.
    """
    payload = decode_supabase_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return user_id

import os
import jwt
import base64
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from database import supabase

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Try using the raw SUPABASE_JWT_SECRET string.
signing_key = SUPABASE_JWT_SECRET

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def decode_supabase_token(token: str) -> dict | None:
    """Decode and verify a Supabase-issued JWT locally using HS256 (fallback)."""
    try:
        header = jwt.get_unverified_header(token)
        # If the token is signed with ES256, we can't verify locally without public keys,
        # but we can decode claims without verification if needed. However, we should NOT trust unverified claims.
        # This function is now a fallback for HS256.
        alg = header.get("alg", "HS256")
        
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=[alg] if alg != "ES256" else ["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.PyJWTError as e:
        print("JWT Local Decode Error:", e)
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    FastAPI dependency: validates the Supabase JWT and returns the user_id (UUID).
    Supports ES256/HS256 tokens by verifying with the Supabase Auth server.
    """
    # 1. Primary: Verify token via Supabase Auth service (supports ES256 automatically)
    try:
        user_resp = supabase.auth.get_user(token)
        if user_resp and user_resp.user:
            return user_resp.user.id
    except Exception as e:
        print("Supabase SDK auth verification failed:", e)

    # 2. Fallback: Local decode for HS256 tokens (useful for testing/seeding)
    payload = decode_supabase_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return user_id

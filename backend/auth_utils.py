import os
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from database import supabase

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Try using the raw SUPABASE_JWT_SECRET string.
signing_key = SUPABASE_JWT_SECRET

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

import time

# Simple in-memory cache to prevent network requests to Supabase on every API call.
# Maps token string -> (user_id, expiration_timestamp)
TOKEN_CACHE = {}

def decode_supabase_token(token: str) -> dict | None:
    """Decode and verify a Supabase-issued JWT locally using HS256 (fallback)."""
    import jwt
    try:
        header = jwt.get_unverified_header(token)
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

def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    FastAPI dependency: validates the Supabase JWT and returns the user_id (UUID).
    Uses a memory cache to avoid a 1-second network penalty on every button click.
    Runs synchronously so FastAPI offloads it to a threadpool, unblocking the event loop!
    """
    now = time.time()
    
    # 1. Check ultra-fast memory cache first
    if token in TOKEN_CACHE:
        user_id, exp = TOKEN_CACHE[token]
        if now < exp:
            return user_id

    # 2. Verify token via Supabase Auth service (supports ES256 automatically)
    try:
        user_resp = supabase.auth.get_user(token)
        if user_resp and user_resp.user:
            # Cache for 5 minutes (300 seconds)
            TOKEN_CACHE[token] = (user_resp.user.id, now + 300)
            return user_resp.user.id
    except Exception as e:
        print("Supabase SDK auth verification failed:", e)

    # 3. Fallback: Local decode for HS256 tokens (useful for testing/seeding)
    payload = decode_supabase_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    return payload.get("sub")

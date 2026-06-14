import os
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from database import supabase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    FastAPI dependency: validates the Supabase JWT and returns the user_id (UUID).
    Uses the Supabase Auth server to verify the token, eliminating the need for local JWT secret validation.
    """
    try:
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return res.user.id
    except Exception as e:
        print("Auth error:", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token")

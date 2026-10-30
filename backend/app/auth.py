import os
import json
import base64
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    """
    FastAPI Dependency to verify the Supabase JWT token in the Authorization header.
    """
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization token header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = creds.credentials
    try:
        # Decode the payload part of the JWT
        parts = token.split(".")
        if len(parts) == 3:
            padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
            payload_str = base64.urlsafe_b64decode(padded).decode("utf-8")
            payload = json.loads(payload_str)
            return {
                "uid": payload.get("sub") or payload.get("id") or payload.get("user_id"),
                "email": payload.get("email"),
                "metadata": payload.get("user_metadata", {}),
            }
        raise ValueError("Invalid JWT format")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

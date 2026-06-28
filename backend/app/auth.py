import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth

# We use HTTPBearer to extract the Authorization header automatically
security = HTTPBearer()

# Firebase Admin SDK should be initialized once in the main application entry point (e.g., main_fastapi.py).
# This file will assume it has been initialized.

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    """
    FastAPI Dependency to verify the Firebase ID token in the Authorization header.
    """
    if not firebase_admin._apps:
        raise RuntimeError("Firebase Admin SDK has not been initialized. Please initialize it in your main application file.")
    try:
        decoded_token = auth.verify_id_token(creds.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth

# We use HTTPBearer to extract the Authorization header automatically
security = HTTPBearer()

# Initialize Firebase Admin SDK
# In production, you'll want to point this to your downloaded serviceAccountKey.json
cred_path = os.getenv("FIREBASE_CREDENTIALS")
if cred_path and os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    # Initializes with default credentials (useful for GCP environments)
    try:
        firebase_admin.initialize_app()
    except ValueError:
        pass  # App already initialized

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    """
    FastAPI Dependency to verify the Firebase ID token in the Authorization header.
    """
    try:
        decoded_token = auth.verify_id_token(creds.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
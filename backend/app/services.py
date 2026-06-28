import os
import sys
import firebase_admin
from firebase_admin import credentials
from dotenv import load_dotenv

# Resolve project root (3 levels up from backend/app/services.py)
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if WORKSPACE_ROOT not in sys.path:
    sys.path.append(WORKSPACE_ROOT)

# Explicitly load root .env
dotenv_path = os.path.join(WORKSPACE_ROOT, '.env')
load_dotenv(dotenv_path=dotenv_path, override=True)

cred_path = os.getenv("FIREBASE_CREDENTIALS")

if not cred_path:
    raise FileNotFoundError(
        "FIREBASE_CREDENTIALS is not set. "
        f"Looked in .env at: {dotenv_path}"
    )

if not os.path.exists(cred_path):
    raise FileNotFoundError(
        f"FIREBASE_CREDENTIALS path does not exist: '{cred_path}'\n"
        f"Loaded .env from: {dotenv_path}\n"
        "If running in WSL, make sure the path uses /mnt/c/... not C:\\..."
    )

cred = credentials.Certificate(cred_path)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

print(f"[Firebase] Initialized with credentials: {cred_path}")
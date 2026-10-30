import os
import sys
from dotenv import load_dotenv

# Resolve project root (3 levels up from backend/app/services.py)
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if WORKSPACE_ROOT not in sys.path:
    sys.path.append(WORKSPACE_ROOT)

# Explicitly load root .env
dotenv_path = os.path.join(WORKSPACE_ROOT, '.env')
load_dotenv(dotenv_path=dotenv_path, override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if SUPABASE_URL and SUPABASE_KEY and not "placeholder-project" in SUPABASE_URL:
    print(f"[Supabase] Backend services connected to: {SUPABASE_URL}")
else:
    print("[Supabase] Backend services operating in local fallback mode.")

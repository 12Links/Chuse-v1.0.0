# Backend Setup

This folder contains a starter Python backend for the project.

## Requirements
- Python 3.12+

## Setup and Running

Follow these steps from the project's **root directory** to set up and run the backend.

1.  **Create the Virtual Environment**

    Navigate into the backend folder and create a new virtual environment. This only needs to be done once.
    ```bash
    # Navigate into the backend directory
    cd backend

    # Create a virtual environment named 'venv'
    python -m venv venv
    ```

2.  **Activate the Environment**

    You'll need to activate the environment every time you work on the project in a new terminal session.
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

3.  **Install Dependencies**

    With your virtual environment active, install all the required packages from `requirements.txt`.
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set Up Environment Variables**

    The backend requires environment variables for database and Firebase connections. From the project's **root directory** (not the `backend` directory), create a `.env` file:
    ```
    # In c:/Users/jacky/Documents/GitHub/Chuse-v1.0.0/.env
    DATABASE_URL="postgresql://user:password@host:port/database"
    FIREBASE_CREDENTIALS="c:/Users/jacky/Documents/GitHub/Chuse-v1.0.0/your-service-account-file.json"
    ```
    Replace the `DATABASE_URL` with your actual PostgreSQL connection string and update `FIREBASE_CREDENTIALS` with the correct path to your service account key file.

5.  **Run the Application**

    With the virtual environment still active, run the Python server. It will listen on port 8000.
    This command starts the high-performance Uvicorn server with your FastAPI application.
    ```bash
    # From the 'backend' directory
    python main_fastapi.py
    ```
    Keep this terminal window open. In a new terminal, you can now start the frontend application.

#  Chuse Scraper Database Setup Guide

This document outlines the one-time setup required to run the Python web scraper and connect it securely to our Google Cloud SQL (PostgreSQL) database.

## 🛠 Prerequisites

Before starting, ensure you have the following installed on your machine:

1. **Python 3.x**
2. **Google Cloud CLI (`gcloud`)** - [Installation Guide](https://cloud.google.com/sdk/docs/install)
3. **Cloud SQL Auth Proxy v2** - Used to securely connect to the database without IP allowlists.

### Installing Cloud SQL Proxy

- **macOS (Homebrew):**
  ```bash
  brew install cloud-sql-proxy
  ```

- **Linux (AMD64):**
  ```bash
  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.23.0/cloud-sql-proxy.linux.amd64
  chmod +x cloud-sql-proxy
  sudo mv cloud-sql-proxy /usr/local/bin/
  ```

- **Windows:** Download the `.exe` from the [Google Cloud documentation](https://cloud.google.com/sql/docs/postgres/sql-proxy) and add it to your PATH.

---

## Step-by-Step Setup

### Step 1: Install Python Dependencies

Open your terminal in the project root and install the required Python packages:

```bash
pip install psycopg2-binary requests
```

### Step 2: Authenticate with Google Cloud

Because our database requires secure access, you must log in with your Google Workspace credentials. Run:

```bash
gcloud auth application-default login
```

> **Note:** A browser window will open. If you ever get a `reauth related error (rapt_required)` later on, it means your session expired, and you just need to run this command again.

### Step 3: Start the Cloud SQL Proxy

Open a **new, dedicated terminal window** and run the following command to open a secure tunnel to the database:

```bash
cloud-sql-proxy --port 5432 choose-edec8:us-east4:frontend-fdc
```

> **CRITICAL:** Leave this terminal window open and running. If you close it or kill the process (Ctrl+C), your database connection will drop!

### Step 4: Configure the Database User (`scraper_user`)

*(Note: If a teammate has already created this user in the database, you can skip to Step 5. You only need the password they set.)*

If the user hasn't been created yet, the easiest way to do it is via the Google Cloud Console:

1. Go to the **Google Cloud Console** > **Cloud SQL**.
2. Click on the instance: `frontend-fdc`.
3. In the left menu, click **Cloud SQL Studio** and log in as the `postgres` admin.
4. Run the following SQL query:

```sql
CREATE ROLE scraper_user WITH LOGIN PASSWORD 'your_secure_password_here';
GRANT USAGE ON SCHEMA public TO scraper_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO scraper_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO scraper_user;
```

*(Alternative: You can run the `setup_scraper_role.sql` script via the `psql` CLI if you have it installed locally: `psql -U postgres -h localhost -p 5432 -d choose-edec8-database -f setup_scraper_role.sql`)*

### Step 5: Set the Password Environment Variable

To keep our credentials secure, the Python script reads the database password from an environment variable. You must set this in the terminal where you plan to run the scraper.

**For Linux / macOS (Bash / Zsh):**

```bash
export CHUSE_DB_PASSWORD="the-password-for-scraper-user"
```

**For Windows (PowerShell):**

```powershell
$env:CHUSE_DB_PASSWORD="the-password-for-scraper-user"
```

*(Make sure to keep the quotation marks!)*

### Step 6: Run the Scraper

With the proxy running in one terminal, and your environment variable set in your main terminal, you are ready to go!

Run the startup script:

```bash
./start.sh
```

---

## Common Troubleshooting

- **Error: `psql: command not found`**
  - You don't have the PostgreSQL client installed.
  - Fedora: `sudo dnf install postgresql`
  - Ubuntu: `sudo apt-get install postgresql-client`
  - macOS: `brew install libpq && brew link --force libpq`

- **Error: `server closed the connection unexpectedly` or `rapt_required`**
  - Your Google Cloud credentials timed out. Stop the proxy, run `gcloud auth application-default login` again, and restart the proxy.

- **Error: `role "scraper_user" already exists`**
  - The user is already set up! If you don't know the password, go to the Google Cloud Console -> Cloud SQL -> Users, click the three dots next to `scraper_user`, and click **Change Password**. Then use that new password in Step 5.

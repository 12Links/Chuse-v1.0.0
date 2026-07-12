-- 1. Create the user and set the password
-- CHANGE 'my_super_secret_password' to whatever you want, but remember it for Step 4!
CREATE ROLE scraper_user WITH LOGIN PASSWORD 'admin12links';

-- 2. Grant basic connection usage to the public schema
GRANT USAGE ON SCHEMA public TO scraper_user;

-- 3. Grant permission to read and write data to existing tables
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO scraper_user;

-- 4. Ensure the user automatically gets these permissions for any future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO scraper_user;
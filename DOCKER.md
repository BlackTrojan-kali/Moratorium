# Run Moratorium with Docker

This setup runs the React frontend, Node.js API, and PostgreSQL database with the same versions and configuration on computers A, B, and C.

## First start

Install Docker Desktop and make sure its engine is running. From the repository folder:

```powershell
Copy-Item .env.docker.example .env
```

Open `.env` and replace `POSTGRES_PASSWORD` with a strong URL-safe password. Then start the application:

```powershell
docker compose up --build -d
docker compose ps
```

Open <http://localhost:8080>. The API health endpoint is <http://localhost:8080/api/v1/health>.

The backend waits for PostgreSQL, applies every unapplied numbered migration, and then starts. PostgreSQL data is stored in the named `postgres_data` volume and survives normal container restarts.

## Create the first administrator

Run this once after the first successful start:

```powershell
.\docker-create-admin.ps1
```

The script prompts for the email, display name, and password without placing the password in command history.

## Daily commands

```powershell
# Start in the background
docker compose up -d

# View status and logs
docker compose ps
docker compose logs -f backend

# Rebuild after pulling code changes
docker compose up --build -d

# Stop without deleting database data
docker compose down
```

Do not run `docker compose down -v` unless you intentionally want to delete the local PostgreSQL database.

## Computers B and C

After these files have been committed and pushed from A, each developer runs:

```powershell
git pull
Copy-Item .env.docker.example .env
# Set a private POSTGRES_PASSWORD in .env, then:
docker compose up --build -d
```

Each computer receives the same application dependencies, PostgreSQL version, and database schema. Each computer has its own local database volume.

## Existing data from A

Docker and Git reproduce the database schema, not A's existing records. If B or C needs a copy of A's records, create a sanitized PostgreSQL dump and transfer it securely. Never commit a dump containing personal, authentication, or production information to GitHub.

## Troubleshooting

```powershell
docker compose logs database
docker compose logs backend
docker compose config
```

- If port 8080 is occupied, change `APP_PORT` in `.env` and make `CORS_ORIGIN` use the same port.
- The backend uses the hostname `database`, not `localhost`, because PostgreSQL is another Compose service.
- Keep `NODE_ENV=development` for local HTTP. Production mode creates secure authentication cookies and requires HTTPS.
- If the password contains URL-reserved characters, URL-encode them or use the URL-safe characters described in `.env.docker.example`.


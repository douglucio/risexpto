# Local infrastructure

Copy `.env.example` to `.env` and replace all `change-me-locally` values. These credentials are for an isolated development machine only.

```bash
docker compose up -d
docker compose ps
docker compose down
```

PostgreSQL listens on 5432, Redis on 6379, and Keycloak on 8080. Persistent named volumes are retained by `down`; removing volumes destroys local data and must be an explicit operator action.

Keycloak runs in development mode in this compose file. Production requires TLS, an external PostgreSQL database, managed secrets, hostname validation, backups, and a separately reviewed realm export.

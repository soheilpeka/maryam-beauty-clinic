# Isolated Shannon preparation — 2026-10-09

The environment is prepared and validated. No penetration test or Shannon worker was started.

## Launch only the isolated application

```powershell
& 'C:\Users\My Pc\maryam-shannon-isolated-20261009\launch.ps1'
```

The launcher refuses an occupied port, starts the isolated app and ingress proxy, and runs isolation checks. A failed check stops both containers. It never invokes Shannon's entrypoint. The reachability check overrides the installed Shannon image's entrypoint with Node and performs one GET of the synthetic marker.

Open http://localhost:3050/en. Containers use http://host.docker.internal:3050. Docker Desktop provides that host address ([Docker documentation](https://docs.docker.com/desktop/features/networking/networking-how-tos/)).

Stop without deleting data:

```powershell
docker compose -f 'C:\Users\My Pc\maryam-shannon-isolated-20261009\compose.yaml' stop proxy app
```

## Database and credentials

- Database: `/data/shannon-pentest.db` in Docker volume `maryam-shannon-isolated-20261009_data`. No clinic filesystem or Docker socket is mounted.
- Prisma 7 CLI configuration supplies the SQLite URL separately from the application's libSQL runtime adapter. The snapshot's runtime adapter rejects any URL other than `file:/data/shannon-pentest.db` and rejects a nonempty auth token.
- Full current Prisma schema initialized with `db push` against the new volume; Prisma Client generated in the Linux image. No production migration or reset command was run.
- Admin: `admin@pentest.invalid` / `Pentest-Only-Admin-2026!` (bcrypt hash stored).
- Guest customer fixtures: `customer@pentest.invalid` and `second-customer@pentest.invalid`. The application has no customer password login. Booking and store flows use guest details and signed private links.
- Synthetic booking: `PENTEST-REQUEST-001`; service: `pentest-service`; product: `pentest-product`, SKU `PENTEST-001`.
- Synthetic booking link is stored in `/data/synthetic-links.json`; retrieve it with `docker exec maryam-shannon-isolated cat /data/synthetic-links.json`. These links and the signing key are dummy, local-only fixtures.
- Seed refuses existing account data. Preparation refuses an existing snapshot directory. Neither script deletes or resets a database.

## Isolation evidence

The current machine-readable report is `C:\Users\My Pc\maryam-shannon-isolated-20261009\verification.json`.

| Check | Result |
| --- | --- |
| Actual server Prisma query: `PRAGMA database_list` | PASS: main = `/data/shannon-pentest.db` |
| Actual server reads synthetic customer marker | PASS: `SHANNON_SYNTHETIC_ONLY` |
| Existing schema matches snapshot schema at preparation | PASS: SHA256 `F85F04CC9A1A1120C846650138E88340815E21D7FBA9D4E53D02DFDFB712DE45` |
| Production/staging `.env`, DB files and uploaded media excluded | PASS: source-only allowlist; no `.env` or DB files in snapshot/image context |
| App network | PASS: single internal network; no gateway; no directly published app ports |
| App outbound TCP probe | PASS: `ENETUNREACH` on public IP port 443; no production endpoint contacted |
| Turso access | PASS: no credentials, exact local adapter guard, no external route, no clinic mounts |
| App mount | PASS: only dedicated named data volume |
| Ingress proxy | PASS: fixed `app:3050` destination; CONNECT rejected; read-only root and script; no DB mount |
| Port exposure | PASS: proxy publishes only `127.0.0.1:3050` |
| Email/SMS | PASS: mock provider; synthetic contact HTTP 200 and mock email log |
| Payments | PASS: mock checkout HTTP 201; PAID order and `mock` / `MOCK-` payment record |
| External/cloud writes | PASS: no service credentials or provider activation; app outbound network blocked; uploads remain in isolated DB |
| Dummy admin / unauthenticated admin | PASS: HTTP 200 / 401 |
| Signed synthetic booking page | PASS: HTTP 200 and synthetic reference rendered |
| EN, FR, store pages | PASS: HTTP 200 |
| Installed Shannon image GET via host.docker.internal:3050 | PASS: synthetic marker confirmed; entrypoint disabled |
| Source `dev.db` after preview stopped vs after checks | PASS: SHA256 `FF9E990764F44470A28104A37ED005628B0DFF66D7137BF8FDBBFFAE85917B3B` unchanged |
| Production environment changes, deployment, actual scan | PASS: none performed |

This is a development-mode snapshot, allowing the existing local mock payment boundary and HTTP cookies. It is not proof of production-mode behavior, deployment, live provider integration, or vulnerability absence. Uploaded owner media is intentionally absent. A separate fixed-destination ingress proxy is necessary because this Docker Desktop configuration does not publish the app's internal-network port directly. The proxy has an ingress network; the application remains exclusively on its internal network.

The main repository has concurrent edits. They were preserved; the schema and contact route were refreshed during preparation to include the current contact-message model. Only new preparation/verification scripts, this document and an appended progress entry were added by this task. The source database was never opened through Prisma or copied into the environment; read-only hashes were taken for comparison. Remote Turso databases were not contacted.

Do not enable Shannon if the launcher reports any isolation failure. This document deliberately supplies no scan command.

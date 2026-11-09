# Moratorium Management System

React and TypeScript frontend skeleton for the CNPS moratorium workflow.

## Start locally

```bash
npm install
npm run dev
```

The prototype starts with a role selector so each dashboard can be reviewed independently.

## Included roles

- Employer representative
- AGENT (DT) — processing officer
- CE / CEA — technical opinion
- S-DCT — endorsement
- DT — technical director
- DG — general manager
- CPS — deposits, execution and recovery
- System administrator

## Source organization

- `src/app`: routing and application composition
- `src/components`: reusable interface primitives and shell
- `src/features`: role dashboards and future business modules
- `src/config`: navigation and role configuration
- `src/types`: shared domain types

This is a frontend skeleton with demonstration data. Connect feature services to the Node.js API through `VITE_API_URL` during implementation.

## Docker setup

The repository includes a reproducible frontend, API, and PostgreSQL environment for development computers. See [DOCKER.md](./DOCKER.md) for setup, administrator creation, data persistence, and troubleshooting instructions.

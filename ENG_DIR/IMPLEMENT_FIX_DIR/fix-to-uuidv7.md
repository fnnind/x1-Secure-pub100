@Context
We are strictly enforcing UUIDv7 for all database entity primary keys to ensure Postgres B-tree index scalability. We have identified a regression where `crypto.randomUUID()` or UUIDv4 is being used.
Role: You are the Senior Backend Developer.

@Task
Find and replace all instances of UUIDv4 generation with UUIDv7 for database entity creation.

@Phase 1: Audit
1. Scan all files in `lib/services/*` and our API routes directory (`app/api/*` or `pages/api/*`).
2. Identify all usages of `crypto.randomUUID()`, `uuid()`, or `v4()`.
3. Provide a Status Report listing the exact files and functions where these are found. DO NOT make changes yet.

@Phase 2: Dependency Check & Refactor
1. Check `package.json`. If `uuid` and `@types/uuid` are missing, provide the exact package manager command to install them.
2. Replace the identified v4 calls with:
   `import { v7 as uuidv7 } from 'uuid';`
   and update the generation logic to `uuidv7()`.
3. Provide a Status Report of the modifications made in each file.
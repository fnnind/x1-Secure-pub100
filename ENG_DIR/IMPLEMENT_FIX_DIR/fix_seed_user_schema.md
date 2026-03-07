### Root cause — auth.identities was missing
- Supabase Auth's signInWithPassword joins auth.users → auth.identities to resolve the login provider. Without the identities row, it throws "Database error querying schema" even though auth.users exists. The script now inserts into all 3 tables per user:
```
┌─────────────────┬────────────────────────────────────────────────────┐
│      Table      │                      Purpose                       │
├─────────────────┼────────────────────────────────────────────────────┤
│ auth.users      │ Core auth record, bcrypt password, email confirmed │
├─────────────────┼────────────────────────────────────────────────────┤
│ auth.identities │ Links user to email provider — was missing         │
├─────────────────┼────────────────────────────────────────────────────┤
│ public.user     │ App profile row (upsert)                           │
└─────────────────┴────────────────────────────────────────────────────┘
```

### Login debugging (app/(auth)/login/page.tsx)
- console.error logs full error object: message, status, code, name
- UI now shows message · code: … · status: … so you can see exactly what Supabase returns

### Auth callback logging (app/auth/callback/route.ts)
- Logs on every email confirmation link click: code prefix, userId, email, email_confirmed_at, provider
- Logs full error details if exchangeCodeForSession fails
- Logs a warning if no code param is present

### QA
- Check your Next.js terminal (pnpm dev) for all [auth/callback] and [login] output.
/**
 * @file env.ts
 * @what Single source of truth for every environment variable the Next.js
 *       app reads, validated with zod via @t3-oss/env-nextjs. Replaces
 *       scattered `process.env.X!` reads (which fail silently/late — a typo'd
 *       or missing var only blows up deep inside whatever function first
 *       touches it, often at request time in production).
 *
 *       `server` vars are wrapped in a Proxy that throws if ever accessed
 *       from client-bundled code — this is a second guard on top of the
 *       `import 'server-only'` convention already used in admin.ts/mailer.ts,
 *       not a replacement for it.
 *
 *       `client` vars (NEXT_PUBLIC_*) are inlined at build time, so every
 *       one MUST be listed literally in `runtimeEnv` as `process.env.NEXT_PUBLIC_X`
 *       — Next.js's webpack/turbopack DefinePlugin-style replacement only
 *       rewrites literal `process.env.NEXT_PUBLIC_*` accesses it can see
 *       statically, not `env.NEXT_PUBLIC_X` or destructured values.
 *
 * @exports env
 * @dependents lib/supabase/{admin,client,server,middleware}.ts,
 *             lib/email/mailer.ts, context/AppContext.tsx,
 *             components/TopNavBar.tsx, components/views/AuthView.tsx
 *
 * NOT covered here: supabase/functions/send-notification/index.ts (a Deno
 * Edge Function, outside the Next.js build — reads Deno.env directly) and
 * the Postgres-side Vault secrets consumed by the escalation cron (see
 * SUPABASE_SETUP.md Step 8) — neither is part of the Next.js runtime env.
 */

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Bypasses ALL Row Level Security — server/API routes only. See
    // lib/supabase/admin.ts for the "never import into browser-bundled
    // code" rule this variable's Proxy guard enforces at runtime.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

    // Brevo transactional email API credentials — all optional.
    // lib/email/mailer.ts falls back to console.log when unset
    // (zero-config demo path).
    BREVO_API_KEY: z.string().min(1).optional(),
    BREVO_SENDER_EMAIL: z.string().email().optional(),
    BREVO_SENDER_NAME: z.string().min(1).default('Dayflow'),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

    // 'true' | 'false' string in the environment, exposed as a real
    // boolean everywhere it's consumed (AppContext, TopNavBar, AuthView,
    // middleware). Defaults to false — real Supabase auth mode.
    NEXT_PUBLIC_BYPASS_AUTH: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BYPASS_AUTH: process.env.NEXT_PUBLIC_BYPASS_AUTH,
  },
  emptyStringAsUndefined: true,
});

/**
 * @file lib/supabase/admin.ts
 * @what Service-role Supabase client. Bypasses RLS entirely.
 * @exports supabaseAdmin (singleton)
 * @dependents app/api/* route handlers, lib/permissions.ts
 *
 * ⚠️  NEVER import this file from a Server Component, Client Component,
 *     or any file that could be bundled into the browser. The service_role
 *     key grants superuser access — it has no RLS safety net.
 *
 *     Correct usage pattern in every API route:
 *       1. Verify session:  supabase.auth.getUser() [server client, anon key]
 *       2. Run canAccess()  [uses supabaseAdmin internally]
 *       3. Query data:      supabaseAdmin.from(...)  [after canAccess passes]
 *
 * NOTE on typing: we use `createClient()` without the Database generic here.
 * Hand-written `Database` interfaces with `Omit<>` in Insert types cause
 * supabase-js's strict generic inference to resolve `.from()/.rpc()` as
 * `never`. The service-role client is server-only and query results are
 * explicitly typed via `as` casts in route files. The browser client
 * (lib/supabase/client.ts) uses the Database generic for frontend type safety.
 * See: https://github.com/supabase/supabase-js/issues/1057
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate at module load time to fail fast in misconfigured environments.
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '[supabaseAdmin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
    'Check your .env.local file.'
  );
}

/**
 * Service-role client — RLS bypassed. Use ONLY in app/api/* route handlers,
 * AFTER verifying the session and running canAccess().
 *
 * For Server Components / RSC data fetching, use the anon-key server client
 * from lib/supabase/server.ts instead (which is RLS-bound).
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken:   false,
    persistSession:     false,
    detectSessionInUrl: false,
  },
});

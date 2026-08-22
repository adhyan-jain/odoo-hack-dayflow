import { createBrowserClient } from "@supabase/ssr";

// NOTE: no `<Database>` generic here — see lib/supabase/admin.ts for why
// (hand-written Database types with Omit<>-based Insert shapes collapse
// supabase-js's .from()/.rpc() inference to `never`; supabase-js#1057).
// Callers cast query results explicitly (see lib/supabase/hrms.ts).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

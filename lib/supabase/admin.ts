import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ⚠️ Ce client utilise la clé service_role, qui contourne complètement la RLS.
// Ne JAMAIS l'importer dans un composant client ou l'exposer au navigateur.
// Réservé aux routes serveur qui n'ont pas de session utilisateur (ex: webhooks).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Dipanggil dari Server Component: penyegaran sesi ditangani middleware.
        }
      },
    },
  });
}

/**
 * User yang sedang login, atau null.
 * Memakai getClaims(): token diverifikasi lokal (kunci JWT asimetris) tanpa
 * bolak-balik ke server Auth, sehingga jauh lebih cepat daripada getUser().
 */
export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user = claims?.sub
    ? { id: claims.sub as string, email: (claims.email as string | undefined) ?? undefined }
    : null;
  return { supabase, user };
}

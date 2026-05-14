import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieItem = { name: string; value: string; options?: CookieOptions };

export function supabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return store.getAll(); },
        setAll(items: CookieItem[]) {
          try {
            items.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // middleware handles refresh in mutating routes
          }
        },
      },
    },
  );
}

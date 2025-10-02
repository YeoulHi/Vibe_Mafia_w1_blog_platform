import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/constants/env";
import type { Database } from "./types";

type WritableCookieStore = Awaited<ReturnType<typeof cookies>> & {
  set?: (options: {
    name: string;
    value: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none" | boolean;
    secure?: boolean;
  }) => void;
};

type SupabaseCookie = {
  name: string;
  value: string;
  options?: {
    path?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none" | boolean;
    secure?: boolean;
  };
};

const safelySetCookie = (
  cookieStore: WritableCookieStore,
  cookie: SupabaseCookie,
) => {
  if (typeof cookieStore.set !== "function") {
    return;
  }

  try {
    cookieStore.set({ name: cookie.name, value: cookie.value, ...cookie.options });
  } catch {
    // Next.js 15 이상에서는 Route Handler나 Server Action 외부에서 cookie write가 제한된다.
    // 해당 상황에서는 Supabase 세션 동기화를 건너뛰고, 이후 처리 흐름은 기존 쿠키를 사용한다.
  }
};

export const createSupabaseServerClient = async (): Promise<
  SupabaseClient<Database>
> => {
  const cookieStore = (await cookies()) as WritableCookieStore;

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => safelySetCookie(cookieStore, cookie));
        },
      },
    },
  );
};

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  if (typeof window !== 'undefined') {
    console.error("Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados");
  }
}

export const supabase = createClient(url || '', key || '');

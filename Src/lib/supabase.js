import { createClient } from '@supabase/supabase-js'

const normalizeSupabaseUrl = (url) => {
  return (url || '')
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '')
}

const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

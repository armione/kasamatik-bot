// Fix: Manually define the types for `import.meta.env` to resolve TypeScript errors
// when `tsconfig.json` is not properly configured to include Vite's client types.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

// FIX: Augment the global `ImportMeta` interface from within a module scope.
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key must be provided in environment variables.');
  // Create a dummy client to avoid crashing the app on startup
  supabase = createClient('https://dummy.url', 'dummy.key');
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase };

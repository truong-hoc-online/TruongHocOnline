// Deployment settings. Empty = offline mode (everything stays on this device).
// Supabase: fill in the Project URL and the anon/publishable key ONLY. Never put the service_role key here:
// this file is public. Access is protected by Row Level Security policies on the database.
export const BACKEND = {
  supabaseUrl: 'https://ahppbfhwhyiycxsusntj.supabase.co',
  supabaseAnonKey: 'sb_publishable_wE0xQ01XQ1E7NWumRtr9kg_kwgJeWPU', // publishable (public) key — safe in the browser
};

export const GAME_VERSION = '0.4.0';

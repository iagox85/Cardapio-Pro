window.supabaseClient = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.publishableKey
);

const supabaseClient = window.supabaseClient;

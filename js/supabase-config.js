// Use the project's public anon/publishable key only. Never place a service-role key here.
const SUPABASE_URL = 'https://laxihqeckpbqxihkauzp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MBOJDhyc7IJFXWvhlNDt0Q_DN21F4Fz';

window.hotelSupabaseClient = null;
window.hotelSupabaseConfigurationError = '';

function initializeSupabaseClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        window.hotelSupabaseConfigurationError = 'La bibliothèque Supabase n’a pas pu être chargée. Vérifiez la connexion Internet.';
        return;
    }
    if (SUPABASE_URL.includes('YOUR_PROJECT_ID') || SUPABASE_ANON_KEY.includes('YOUR_')) {
        window.hotelSupabaseConfigurationError = 'Supabase n’est pas configuré. Renseignez l’URL du projet et sa clé publique dans js/supabase-config.js.';
        return;
    }

    window.hotelSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
}

initializeSupabaseClient();

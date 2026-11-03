// Configuración PUBLICA de Supabase. La clave 'publishable' o 'anon' es pública
// y SOLO es segura con las políticas RLS de supabase_setup.sql ya aplicadas.
// Nunca usar aquí la contraseña de la base de datos ni la service_role/secret key.
window.PF_CONFIG = Object.freeze({
  url: 'https://icemxcczzopnpsgsuhnq.supabase.co',
  publishableKey: 'PON_AQUI_LA_CLAVE_PUBLICABLE_DE_SUPABASE',
  activityId: 'pulsofit-checks-1dam'
});

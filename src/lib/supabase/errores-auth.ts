/** Traducción de errores de Supabase Auth a mensajes comprensibles (sin exponer internos). */
const MENSAJES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos. Verifica e intenta de nuevo.",
  email_not_confirmed: "Tu correo aún no está confirmado. Revisa tu bandeja de entrada.",
  user_not_found: "Si el correo existe, te enviaremos las instrucciones.",
  user_banned: "Esta cuenta está deshabilitada. Contacta a la administración.",
  weak_password: "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.",
  same_password: "La nueva contraseña debe ser distinta a la anterior.",
  over_email_send_rate_limit: "Demasiados intentos. Espera unos minutos antes de reintentar.",
  validate_email_address: "Ingresa un correo electrónico válido.",
  session_expired: "Tu sesión expiró. Vuelve a iniciar sesión.",
  signup_disabled: "El registro self-service está deshabilitado en este sistema.",
  unexpected_failure: "No pudimos completar la operación. Intenta de nuevo.",
};

export function mensajeDeErrorAuth(codigoOCorreo: string | null | undefined): string {
  if (!codigoOCorreo) return MENSAJES.unexpected_failure ?? "No pudimos completar la operación. Intenta de nuevo.";
  const clave = codigoOCorreo.toLowerCase().trim();
  return MENSAJES[clave] ?? "No pudimos completar la operación. Intenta de nuevo.";
}

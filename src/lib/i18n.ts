export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

// UI string translations
export const UI_STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    instruments: "Instruments",
    journal: "Journal",
    settings: "Settings",
    bullish: "Bullish",
    bearish: "Bearish",
    neutral: "Neutral",
    confidence: "Confidence",
    key_drivers: "Key Drivers",
    daily: "Daily",
    "1week": "1 Week",
    "1month": "1 Month",
    "3month": "3 Month",
    login: "Login",
    register: "Sign Up",
    logout: "Logout",
    free_analysis: "Get daily analysis free",
    track_record: "Track Record",
    community: "Community",
    analysis_archive: "Analysis Archive",
    view_full_analysis: "View Full Analysis",
  },
  es: {
    dashboard: "Panel",
    instruments: "Instrumentos",
    journal: "Diario",
    settings: "Configuración",
    bullish: "Alcista",
    bearish: "Bajista",
    neutral: "Neutral",
    confidence: "Confianza",
    key_drivers: "Factores Clave",
    daily: "Diario",
    "1week": "1 Semana",
    "1month": "1 Mes",
    "3month": "3 Meses",
    login: "Iniciar Sesión",
    register: "Registrarse",
    logout: "Cerrar Sesión",
    free_analysis: "Obtenga análisis diario gratis",
    track_record: "Historial de Rendimiento",
    community: "Comunidad",
    analysis_archive: "Archivo de Análisis",
    view_full_analysis: "Ver Análisis Completo",
  },
};

export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && SUPPORTED_LOCALES.includes(segments[0] as Locale)) {
    return segments[0] as Locale;
  }
  return "en";
}

export function t(locale: Locale, key: string): string {
  return UI_STRINGS[locale]?.[key] || UI_STRINGS.en[key] || key;
}

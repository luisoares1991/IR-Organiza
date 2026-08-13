export const ANALYTICS_CONSENT_KEY = 'recibos_ir_analytics_consent';

function clearAnalyticsCookies() {
  document.cookie.split(';').forEach((item) => {
    const name = item.split('=')[0]?.trim();
    if (!name?.startsWith('_ga')) return;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.luisandre.com.br; SameSite=Lax`;
  });
}

export function setAnalyticsConsent(value) {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // The choice still applies to the current page when storage is restricted.
  }
  window.gtag?.('consent', 'update', {
    analytics_storage: value,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  if (value === 'denied') clearAnalyticsCookies();
}

export function openPrivacyChoices() {
  window.dispatchEvent(new Event('recibos-ir-open-privacy'));
}

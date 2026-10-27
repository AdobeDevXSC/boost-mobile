/**
 * Locale code to path prefix. The default locale lives at the site root.
 */
export const LOCALES = {
  EN: '',
  ES: '/es',
};

/**
 * Resolve the locale by longest-prefix match.
 * @param {string} pathname
 * @returns {string} locale code (defaults to 'EN')
 */
export function detectLocale(pathname) {
  const match = Object.entries(LOCALES)
    .filter(([, prefix]) => prefix)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[0] : 'EN';
}

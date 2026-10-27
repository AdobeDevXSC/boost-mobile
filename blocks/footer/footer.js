import { LOCALES, detectLocale } from '../../scripts/locales.js';

/**
 * Prefer a locale-scoped footer, then the root footer, then /content.
 */
async function fetchFooterHtml() {
  const prefix = LOCALES[detectLocale(window.location.pathname)];
  const candidates = [
    ...(prefix ? [`${prefix}/footer.plain.html`] : []),
    '/footer.plain.html',
    '/content/footer.plain.html',
  ];
  const resp = await candidates.reduce(
    (chain, url) => chain.then((prev) => (prev && prev.ok ? prev : fetch(url))),
    Promise.resolve(null),
  );
  return resp && resp.ok ? resp.text() : null;
}

/**
 * Build the newsletter signup form from the lead-capture section's copy.
 * The section holds two paragraphs (heading + subcopy); the input and button
 * are created here because form controls cannot live in the plain fragment.
 * @param {Element} section the lead-capture section element
 */
function buildNewsletter(section) {
  const form = document.createElement('form');
  form.className = 'footer-newsletter-form';
  form.setAttribute('novalidate', '');

  const input = document.createElement('input');
  input.type = 'email';
  input.name = 'email';
  input.placeholder = 'Email';
  input.setAttribute('aria-label', 'Email');

  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Subscribe';

  form.append(input, button);
  form.addEventListener('submit', (e) => e.preventDefault());
  section.append(form);
}

/**
 * Decorate the footer: fetch the fragment, tag sections, and build the
 * newsletter form. All copy/links/images come from the fragment DOM.
 * @param {Element} block the footer block element
 */
export default async function decorate(block) {
  const html = await fetchFooterHtml();
  block.textContent = '';
  if (!html) return;

  const footer = document.createElement('div');
  footer.innerHTML = html;

  // Section order in footer.plain.html: brand/social, link columns,
  // newsletter, copyright.
  const classes = ['brand', 'links', 'newsletter', 'legal'];
  classes.forEach((c, i) => {
    const section = footer.children[i];
    if (section) section.classList.add(`footer-${c}`);
  });

  const brand = footer.querySelector('.footer-brand');
  if (brand) {
    const socialList = brand.querySelector('ul');
    if (socialList) socialList.classList.add('footer-social');
  }

  const newsletter = footer.querySelector('.footer-newsletter');
  if (newsletter) buildNewsletter(newsletter);

  block.append(footer);
}

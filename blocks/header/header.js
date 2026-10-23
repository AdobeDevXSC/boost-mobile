// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Locale code → path prefix. Add rows here to introduce new languages
 * (e.g. FR: '/fr'). The default locale (English) lives at the site root
 * and so has an empty prefix.
 */
const LOCALES = {
  EN: '',
  ES: '/es',
};

/**
 * Resolve which locale a given pathname is under by longest-prefix match.
 * @param {string} pathname
 * @returns {string} locale code (defaults to 'EN')
 */
function detectLocale(pathname) {
  const match = Object.entries(LOCALES)
    .filter(([, prefix]) => prefix)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[0] : 'EN';
}

/**
 * Build the equivalent URL on the current page in the target locale by
 * swapping the current prefix for the target's. Preserves query and hash.
 * @param {string} code target locale code
 * @returns {string}
 */
function localizedHref(code) {
  const prefix = LOCALES[code] ?? '';
  const current = detectLocale(window.location.pathname);
  const currentPrefix = LOCALES[current];
  let rest = window.location.pathname;
  if (currentPrefix && (rest === currentPrefix || rest.startsWith(`${currentPrefix}/`))) {
    rest = rest.slice(currentPrefix.length) || '/';
  }
  return `${prefix}${rest}${window.location.search}${window.location.hash}`;
}

/**
 * Fetch the nav fragment. Prefers a locale-scoped nav
 * (e.g. /es/nav.plain.html) when the current page is under that locale, so
 * localized nav labels are picked up automatically once authored. Falls back
 * to the root nav, then /content/nav.plain.html.
 */
async function fetchNavHtml() {
  const prefix = LOCALES[detectLocale(window.location.pathname)];
  const candidates = [
    ...(prefix ? [`${prefix}/nav.plain.html`] : []),
    '/nav.plain.html',
    '/content/nav.plain.html',
  ];
  const resp = await candidates.reduce(
    (chain, url) => chain.then((prev) => (prev && prev.ok ? prev : fetch(url))),
    Promise.resolve(null),
  );
  return resp && resp.ok ? resp.text() : null;
}

/**
 * Collapse every open nav section.
 * @param {Element} navSections the sections container
 * @param {Element} [except] a section to leave untouched
 */
function closeAllSections(navSections, except) {
  navSections.querySelectorAll(':scope > ul > li.nav-drop').forEach((li) => {
    if (li !== except) li.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Toggle the whole mobile menu open/closed.
 * @param {Element} nav the nav element
 * @param {Element} navSections the sections container
 * @param {boolean|null} forceExpanded force a state (used on resize)
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  }
  if (expanded || isDesktop.matches) closeAllSections(navSections);
}

/**
 * Build the language selector (a listbox-style dropdown) from the second
 * utility list. Reads the locale codes from the authored list (e.g. EN, ES),
 * which may be plain text or links, derives the current locale from the URL,
 * and wires each option to the translated equivalent of the current page.
 * @param {Element} localeList the <ul> holding locale entries
 * @returns {Element|null} the locale selector, or null if nothing recognizable
 */
function buildLocaleSelector(localeList) {
  const codes = [...localeList.querySelectorAll('li')]
    .map((li) => li.textContent.trim().toUpperCase())
    .filter((code) => code && LOCALES[code] !== undefined);
  if (!codes.length) return null;

  const detected = detectLocale(window.location.pathname);
  const current = codes.includes(detected) ? detected : codes[0];

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-locale';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-locale-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `<span>${current}</span>`;

  const list = document.createElement('ul');
  list.className = 'nav-locale-list';
  codes.filter((code) => code !== current).forEach((code) => {
    const li = document.createElement('li');
    const opt = document.createElement('a');
    opt.href = localizedHref(code);
    opt.textContent = code;
    li.append(opt);
    list.append(li);
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  document.addEventListener('click', () => trigger.setAttribute('aria-expanded', 'false'));

  wrapper.append(trigger, list);
  return wrapper;
}

/**
 * Wire hover (desktop) and click/accordion (mobile) behavior on a nav section
 * that has a dropdown panel.
 * @param {Element} li the top-level nav <li>
 * @param {Element} navSections the sections container
 */
function wireNavDrop(li, navSections) {
  const link = li.querySelector(':scope > a');

  // Desktop: open on hover of the whole item.
  li.addEventListener('mouseenter', () => {
    if (isDesktop.matches) {
      closeAllSections(navSections, li);
      li.setAttribute('aria-expanded', 'true');
    }
  });
  li.addEventListener('mouseleave', () => {
    if (isDesktop.matches) li.setAttribute('aria-expanded', 'false');
  });

  // Mobile: tapping the label toggles the accordion instead of navigating.
  if (link) {
    link.addEventListener('click', (e) => {
      if (!isDesktop.matches) {
        e.preventDefault();
        const open = li.getAttribute('aria-expanded') === 'true';
        closeAllSections(navSections, open ? null : li);
        li.setAttribute('aria-expanded', open ? 'false' : 'true');
      }
    });
  }
}

/**
 * Decorate the header block: build the utility bar, brand, nav sections and
 * tools from the fetched fragment.
 * @param {Element} block the header block element
 */
export default async function decorate(block) {
  const html = await fetchNavHtml();
  block.textContent = '';
  if (!html) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // Section order in nav.plain.html: utility, brand, sections, tools.
  const classes = ['utility', 'brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // Utility bar: first <ul> = links, second <ul> = locale selector.
  const navUtility = nav.querySelector('.nav-utility');
  if (navUtility) {
    const lists = navUtility.querySelectorAll(':scope > ul');
    if (lists[1]) {
      const locale = buildLocaleSelector(lists[1]);
      if (locale) lists[1].replaceWith(locale);
    }
  }

  // Nav sections: mark items that have a dropdown and wire behavior.
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    // Mirror the source's ARIA semantics: the top-level list is a menu and each
    // item is a menuitem; each dropdown panel is itself a menu.
    const topList = navSections.querySelector(':scope > ul');
    if (topList) topList.setAttribute('role', 'menu');
    navSections.querySelectorAll(':scope > ul > li').forEach((li) => {
      // The source wraps each section label in a <p> (<li><p><a>…</a></p>).
      // Unwrap it so the CSS that targets `li > a` applies: the fixed-height
      // anchor, the orange hover/active underline, and the mobile chevron.
      const labelLink = li.querySelector(':scope > p > a');
      if (labelLink) labelLink.parentElement.replaceWith(labelLink);
      li.setAttribute('role', 'menuitem');
      const panel = li.querySelector(':scope > ul');
      if (panel) {
        panel.setAttribute('role', 'menu');
        li.classList.add('nav-drop');
        li.setAttribute('aria-expanded', 'false');
        wireNavDrop(li, navSections);
      }
    });
  }

  // Hamburger for mobile.
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // Close open sections on Escape.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (navSections) closeAllSections(navSections);
      if (!isDesktop.matches) toggleMenu(nav, navSections, true);
    }
  });

  // Handle viewport changes: reset the nav to its closed/default state when
  // crossing the breakpoint so neither layout inherits the other's open state.
  // (Forcing aria-expanded='true' here would apply the mobile drawer grid on
  // desktop, since [aria-expanded='true'] outranks the desktop grid rule.)
  isDesktop.addEventListener('change', () => {
    nav.setAttribute('aria-expanded', 'false');
    const button = nav.querySelector('.nav-hamburger button');
    if (button) button.setAttribute('aria-label', 'Open navigation');
    if (navSections) closeAllSections(navSections);
    document.body.style.overflowY = '';
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}

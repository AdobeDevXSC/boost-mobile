// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetch the nav fragment. Metadata-independent dual-fetch:
 * /content first (localhost / aem up), then root (DA/EDS production).
 */
async function fetchNavHtml() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  return resp.text();
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
 * utility list. The first anchor is the current locale; the rest are options.
 * @param {Element} localeList the <ul> holding locale links
 * @returns {Element} the locale selector element
 */
function buildLocaleSelector(localeList) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-locale';

  const links = [...localeList.querySelectorAll('a')];
  const current = links[0];

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-locale-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `<span>${current ? current.textContent.trim() : 'EN'}</span>`;

  const list = document.createElement('ul');
  list.className = 'nav-locale-list';
  links.slice(1).forEach((a) => {
    const li = document.createElement('li');
    const opt = document.createElement('a');
    opt.href = a.href;
    opt.textContent = a.textContent.trim();
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
      lists[1].replaceWith(locale);
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

  // Handle viewport changes: reset mobile menu + open sections when crossing
  // the breakpoint so the layout adapts without a refresh.
  isDesktop.addEventListener('change', () => {
    toggleMenu(nav, navSections, isDesktop.matches);
    if (navSections) closeAllSections(navSections);
    document.body.style.overflowY = '';
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}

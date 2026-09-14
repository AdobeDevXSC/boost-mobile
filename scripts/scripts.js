import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  sampleRUM,
  readBlockConfig,
  toClassName,
  toCamelCase,
} from './aem.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    if (!main.querySelector('.hero')) buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates all sections in a container element.
 * @param {Element} main The container element
 */
function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((e) => {
      if (e.classList.contains('richtext')) {
        e.removeAttribute('class');
        if (!defaultContent) {
          const wrapper = document.createElement('div');
          wrapper.classList.add('default-content-wrapper');
          wrappers.push(wrapper);
          defaultContent = true;
        }
      } else if (e.tagName === 'DIV' || !defaultContent) {
        const wrapper = document.createElement('div');
        wrappers.push(wrapper);
        defaultContent = e.tagName !== 'DIV';
        if (defaultContent) wrapper.classList.add('default-content-wrapper');
      }
      wrappers[wrappers.length - 1].append(e);
    });

    // Add wrapped content back
    wrappers.forEach((wrapper) => section.append(wrapper));
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';

    // Process section metadata
    const sectionMeta = section.querySelector('div.section-metadata');
    if (sectionMeta) {
      const meta = readBlockConfig(sectionMeta);
      Object.keys(meta).forEach((key) => {
        if (key === 'style') {
          const styles = meta.style
            .split(',')
            .filter((style) => style)
            .map((style) => toClassName(style.trim()));
          styles.forEach((style) => section.classList.add(style));
        } else {
          section.dataset[toCamelCase(key)] = meta[key];
        }
      });
      // A `Background` value authored as an image: reuse its optimized <picture>
      // as a full-bleed layer rather than a CSS url() (better for LCP).
      const bgRow = [...sectionMeta.querySelectorAll(':scope > div')]
        .find((row) => toClassName(row.children[0]?.textContent || '') === 'background');
      const bgPicture = bgRow?.children[1]?.querySelector('picture');
      if (bgPicture) {
        section.classList.add('has-background');
        bgPicture.classList.add('section-background');
        section.prepend(bgPicture);
        // the picture is the background, so don't also apply it as a CSS value
        delete section.dataset.background;
      }
      sectionMeta.parentNode.remove();
    }
  });
}

/**
 * Applies flexible, per-instance styling driven by Section Metadata.
 * `decorateSections` exposes each metadata row as a `data-*` attribute:
 *  - `Background` (`data-background`): a CSS color or gradient
 *    (e.g. `#f4681e`, `linear-gradient(...)`) or an image URL, applied as a
 *    cover background-image. An image authored as an asset is instead mounted
 *    as an optimized <picture> layer by `decorateSections`.
 *  - `Color` (`data-color`): the section's overall text color — any CSS color
 *    value (the library exposes named presets like dark=#000000, light=#FFFFFF).
 *  - `Heading Color` (`data-heading-color`): applied to the section's h1–h6.
 *    Accepts any CSS color (hex, named, rgb/hsl, etc.) via the
 *    `--heading-color` custom property, or a gradient (`linear-gradient(...)`,
 *    `radial-gradient(...)`, `conic-gradient(...)`), which is clipped to the
 *    heading text via `--heading-gradient` and a `data-heading-gradient` flag.
 * @param {Element} main The container element
 */
function decorateSectionStyles(main) {
  main.querySelectorAll('.section[data-background]').forEach((section) => {
    const bg = section.dataset.background.trim();
    if (!bg) return;
    // A URL or path (including extension-less CDN URLs like Scene7, or a data
    // URI) is an image; anything else is a CSS color or gradient.
    const isImageUrl = /^(https?:)?\/\//i.test(bg) || /^(\/|data:)/i.test(bg)
      || /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(bg);
    if (isImageUrl) {
      section.style.backgroundImage = `url("${bg}")`;
      section.style.backgroundSize = 'cover';
      section.style.backgroundPosition = 'center';
    } else {
      section.style.background = bg;
    }
  });

  main.querySelectorAll('.section[data-color]').forEach((section) => {
    const color = section.dataset.color.trim();
    if (color) section.style.color = color;
  });

  main.querySelectorAll('.section[data-heading-color]').forEach((section) => {
    const value = section.dataset.headingColor.trim();
    if (!value) return;
    if (/-gradient\(/i.test(value)) {
      section.style.setProperty('--heading-gradient', value);
      section.dataset.headingGradient = '';
    } else {
      section.style.setProperty('--heading-color', value);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateSectionStyles(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  doc.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  if (getMetadata('breadcrumbs').toLowerCase() === 'true') {
    doc.body.dataset.breadcrumbs = true;
  }
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    doc.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  sampleRUM.enhance();

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadSidekick() {
  if (document.querySelector('aem-sidekick')) {
    import('./sidekick.js');
    return;
  }

  document.addEventListener('sidekick-ready', () => {
    import('./sidekick.js');
  });
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
  loadSidekick();
}

// UE Editor support before page load
if (/\.(stage-ue|ue)\.da\.live$/.test(window.location.hostname)) {
  // eslint-disable-next-line import/no-unresolved
  await import(`${window.hlx.codeBasePath}/ue/scripts/ue.js`).then(({ default: ue }) => ue());
}

loadPage();

(function da() {
  const { searchParams } = new URL(window.location.href);

  const lp = searchParams.get('dapreview');
  // eslint-disable-next-line import/no-unresolved
  if (lp) import('https://da.live/scripts/dapreview.js').then((mod) => mod.default(loadPage));

  const exp = searchParams.get('daexperiment');
  // eslint-disable-next-line import/no-unresolved
  if (exp) import('https://da.live/nx/public/plugins/exp/exp.js');
}());

const isBlockLibraryPage = () => {
  return (document.querySelector('div.library-metadata'));
};

// Usage
if (isBlockLibraryPage()) {
  document.body.classList.add('library');
}
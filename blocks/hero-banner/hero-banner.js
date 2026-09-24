/**
 * Hero Banner block.
 *
 * A full-bleed promotional banner whose THEME is chosen at the SECTION level via
 * section-metadata keys (not via the block name):
 *
 *   | Section Metadata   |                                   |
 *   | hero-banner-style  | orange                            |  -> preset theme
 *   | Background         | <image / #hex / linear-gradient()> |  -> optional
 *
 * Presets (hero-banner-style):
 *   `orange`    — orange gradient theme; image sits beside content (split).
 *   `blue`      — navy gradient theme;   image sits beside content (split).
 *   `spotlight` — content-only, left-aligned, overlaid on a full-bleed
 *                 background supplied via the section `Background` metadata.
 *
 * Backgrounds use the project's native `Background` section-metadata key
 * (handled by scripts.js `decorateSections` / `decorateSectionStyles`): a color
 * or gradient becomes the section background, and an image ASSET is mounted as
 * an optimized full-bleed <picture> layer. `orange` and `blue` also carry a
 * baked gradient default. This block adds no background handling of its own.
 *
 * Authoring model — one row with up to two ORDER-SIGNIFICANT cells, each holding
 * either content or an image:
 *   - The cell containing a <picture> is the image; the other is the content.
 *   - Desktop layout follows the authored order: image in column 1 -> left,
 *     column 2 -> right. A single cell -> full-width content.
 *   - An image cell may hold a desktop image and an optional mobile image for
 *     art direction.
 *
 * Content conventions:
 *   - The first paragraph (before any heading) renders as the small eyebrow.
 *   - h1/h2 are the large display lines; h3 is an upright secondary line.
 *   - Wrap words in <em> inside a heading to give them the yellow accent color.
 *   - A CTA is a link wrapped solely in <strong> (primary) or <em> (secondary).
 */

/**
 * Turn a link wrapped solely in <strong> or <em> into a button, even when it
 * shares a paragraph with other CTAs (core decorateButtons only converts a link
 * alone in its paragraph). Idempotent: skips links already styled.
 * @param {Element} container the content cell
 */
function decorateHeroBannerButtons(container) {
  container.querySelectorAll('a:not(.button)').forEach((a) => {
    const parent = a.parentElement;
    if (parent.childNodes.length !== 1) return;
    if (parent.tagName === 'STRONG') {
      a.className = 'button primary';
    } else if (parent.tagName === 'EM') {
      a.className = 'button secondary';
    }
  });
  // group each paragraph of buttons so they lay out as a row
  container.querySelectorAll('a.button').forEach((a) => {
    a.closest('p')?.classList.add('hero-banner-cta');
  });
}

/**
 * Tag an image cell and wire up art direction (desktop + optional mobile image).
 * @param {Element} cell the image cell
 */
function decorateImageCell(cell) {
  cell.classList.add('hero-banner-image');
  const pics = cell.querySelectorAll('picture');
  if (pics.length >= 2) {
    // desktop image on wide screens, mobile image below 1024
    pics[0].classList.add('hero-banner-image-desktop');
    pics[1].classList.add('hero-banner-image-mobile');
    cell.classList.add('has-mobile-image');
  }
}

export default function decorate(block) {
  const section = block.closest('.section');

  // Section-level preset -> class(es) on the block. Backgrounds are handled by
  // the project's native `Background` section-metadata key, not by this block.
  const preset = section?.dataset.heroBannerStyle;
  if (preset) {
    preset.split(/\s+/).filter(Boolean).forEach((token) => block.classList.add(token));
  }

  const row = block.firstElementChild;
  if (!row) return;

  // Classify each authored cell by content, preserving source order so the
  // layout (image left vs right) follows how the author placed the columns.
  [...row.children].forEach((cell) => {
    if (cell.querySelector('picture')) {
      decorateImageCell(cell);
      block.classList.add('has-image');
    } else if (cell.textContent.trim() || cell.children.length) {
      cell.classList.add('hero-banner-content');
      decorateHeroBannerButtons(cell);
    } else {
      // empty cell (e.g. a spacer) — drop it so it doesn't affect layout
      cell.remove();
    }
  });
}

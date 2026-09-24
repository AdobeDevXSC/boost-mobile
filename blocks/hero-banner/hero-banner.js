/**
 * Hero Banner block.
 *
 * A full-bleed promotional banner whose visual THEME is chosen at the SECTION
 * level via a `hero-banner-style` section-metadata key (not via the block name):
 *
 *   | Section Metadata   |        |
 *   | hero-banner-style  | orange |   ->  section.dataset.heroBannerStyle
 *
 * The value is applied as a class on the block. Supported presets:
 *   `orange`    — orange gradient background; inner image left / content right.
 *   `blue`      — navy radial background;   inner image left / content right.
 *   `spotlight` — content-only, left-aligned; the author supplies a full-bleed
 *                 background image via the background-override cell.
 *
 * Authored as one row with three cells (same cell order as the hero block):
 *   Cell 1 — Background override (optional): a single image (rendered behind the
 *            panel) OR a CSS value (hex / gradient) applied as the panel
 *            background. Overrides the preset's default background.
 *   Cell 2 — Content: eyebrow, headings, body copy and CTAs.
 *   Cell 3 — Inner image (optional): a desktop image and an optional mobile
 *            image. Empty -> content-only layout.
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

export default function decorate(block) {
  // Section-level preset -> class(es) on the block.
  const preset = block.closest('.section')?.dataset.heroBannerStyle;
  if (preset) {
    preset.split(/\s+/).filter(Boolean).forEach((token) => block.classList.add(token));
  }

  const row = block.firstElementChild;
  if (!row) return;

  const [bgCell, contentCell, imageCell] = [...row.children];

  // Cell 1 — background override: an image stays as a layer; a CSS value is
  // applied inline (overriding the preset default) and the cell is removed.
  if (bgCell) {
    if (bgCell.querySelector('picture')) {
      bgCell.classList.add('hero-banner-background');
    } else {
      const value = bgCell.textContent.trim();
      if (value) block.style.background = value;
      bgCell.remove();
    }
  }

  // Cell 2 — content
  if (contentCell) {
    contentCell.classList.add('hero-banner-content');
    decorateHeroBannerButtons(contentCell);
  }

  // Cell 3 — inner image(s): drives the content-only vs. split layout
  if (imageCell) {
    const pics = imageCell.querySelectorAll('picture');
    if (pics.length) {
      imageCell.classList.add('hero-banner-image');
      block.classList.add('has-image');
      if (pics.length >= 2) {
        // art direction: desktop image on wide screens, mobile image below 1024
        pics[0].classList.add('hero-banner-image-desktop');
        pics[1].classList.add('hero-banner-image-mobile');
        imageCell.classList.add('has-mobile-image');
      }
    } else {
      imageCell.remove();
    }
  }
}

/**
 * Hero block.
 *
 * Authored as one row with three cells:
 *   Cell 1 — Background: a single image (rendered behind the panel) OR a CSS
 *            value (hex / named color / gradient) applied as the panel background.
 *   Cell 2 — Content: headings, body copy and CTAs.
 *   Cell 3 — Inner image (optional): a desktop image and an optional mobile image.
 *            Empty  -> content is centered.
 *            Filled -> panel splits 50/50 (image left, content right) on desktop.
 *
 * Block variants:
 *   `white-text`        — renders all text (including headings) white. By
 *                         default a heading with no <em> takes the yellow price
 *                         accent; add `white-headings` to keep them all white.
 *   `white-headings`    — opt out of the yellow price accent (pair with
 *                         `white-text`).
 *   `text-align-left`   — left-align the content; with no inner image the
 *                         content column is anchored to the left of the panel.
 *   `text-align-center` — center the content (this is the default).
 *   `text-align-right`  — right-align the content; with no inner image the
 *                         content column is anchored to the right of the panel.
 *   `content-half`      — constrain the content to half the panel width on
 *                         desktop so it clears a subject baked into the
 *                         background image (e.g. players on the far side).
 *
 * Two hero blocks placed in a section with the `Split Hero` style sit side by
 * side (see styles.css).
 */

/**
 * Turn a link wrapped solely in <strong> or <em> into a button, even when it
 * shares a paragraph with other CTAs (the core decorateButtons only converts a
 * link that is alone in its paragraph). Idempotent: skips links already styled.
 * @param {Element} container the content cell
 */
function decorateHeroButtons(container) {
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
    a.closest('p')?.classList.add('hero-cta');
  });
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const [bgCell, contentCell, imageCell] = [...row.children];

  // Cell 1 — background: image stays as a layer, a CSS value is applied inline
  if (bgCell) {
    if (bgCell.querySelector('picture')) {
      bgCell.classList.add('hero-background');
    } else {
      const value = bgCell.textContent.trim();
      if (value) block.style.background = value;
      bgCell.remove();
    }
  }

  // Cell 2 — content
  if (contentCell) {
    contentCell.classList.add('hero-content');
    decorateHeroButtons(contentCell);
  }

  // Cell 3 — inner image(s): drives the centered vs. split layout
  if (imageCell) {
    const pics = imageCell.querySelectorAll('picture');
    if (pics.length) {
      imageCell.classList.add('hero-image');
      block.classList.add('has-image');
      if (pics.length >= 2) {
        // art direction: desktop image on wide screens, mobile image below 1024
        pics[0].classList.add('hero-image-desktop');
        pics[1].classList.add('hero-image-mobile');
        imageCell.classList.add('has-mobile-image');
      }
    } else {
      imageCell.remove();
    }
  }
}

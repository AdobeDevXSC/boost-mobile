/**
 * Announcement banner — a full-width promo bar with a single link.
 * The link fills the bar so a click anywhere navigates to the promo.
 * The core button decoration is stripped so it renders as plain banner text.
 */
export default function decorate(block) {
  const link = block.querySelector('a');
  if (!link) return;
  link.classList.remove('button');
  link.closest('.button-container')?.classList.remove('button-container');
}

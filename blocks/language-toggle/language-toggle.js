export default function decorate(block) {
  const items = [...block.querySelectorAll('ul > li')];
  if (!items.length) throw new Error('Language toggle requires a list of languages');

  const savedLanguage = document.cookie.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('lang='))
    ?.slice('lang='.length);
  const selected = items.find((item) => item.textContent.trim().toLowerCase() === savedLanguage)
    || items[0];
  const buttons = [];

  items.forEach((item) => {
    const label = item.textContent.trim();
    const language = label.toLowerCase();
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(item === selected));
    item.classList.toggle('active', item === selected);
    item.removeAttribute('aria-selected');
    button.addEventListener('click', () => {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `lang=${encodeURIComponent(language)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
      if (!document.cookie.split(';').some((cookie) => cookie.trim() === `lang=${encodeURIComponent(language)}`)) {
        throw new Error('Unable to save the language cookie');
      }
      buttons.forEach((option) => {
        const active = option === button;
        option.setAttribute('aria-pressed', String(active));
        option.parentElement.classList.toggle('active', active);
      });
      document.dispatchEvent(new CustomEvent('languagechange', {
        detail: { lang: language },
      }));
    });
    buttons.push(button);
    item.replaceChildren(button);
  });
}

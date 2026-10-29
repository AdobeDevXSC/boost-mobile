# AEM Block Collection

This project provides a foundation for starting an AEM Edge Delivery Services project. It includes many common blocks and features a project might need.

## DA compatible

This specific repo has been _slightly_ modified to be compatible with DA's live preview.

## Getting started

### 1. Github
1. Use this template to make a new repo.
1. Install [AEM Code Sync](https://github.com/apps/aem-code-sync).

### 2. DA content
1. Browse to https://da.live/start.
2. Follow the steps.

### 3. Local development
1. Clone your new repo to your computer.
1. Install the AEM CLI using your terminal: `sudo npm install -g @adobe/aem-cli`
1. Start the AEM CLI: `aem up`.
1. Open the `{repo}` folder in your favorite code editor and buil something.
1. **Recommended:** Install common npm packages like linting and testing: `npm i`.

## Localized navigation and footer

The header and footer first try locale-specific documents (for example,
`/es/nav` and `/es/footer` on Spanish pages). If unavailable, they fall back to
the root documents (`/nav` and `/footer`), then `/content/nav` and
`/content/footer`. Add locale prefixes in `scripts/locales.js` to enable other
languages for both blocks.

## Localized sections

In Section Metadata, set `Style` to `es` for a Spanish section. Sections without
a language style default to English; `en` can also be set explicitly. Set
`Style` to `shared` for content that should remain visible in both languages.
Combine language and layout styles with commas, for example `es, split-hero`
or `shared, center-ctas`. The `shared` style takes precedence over `en` and `es`.

Language visibility is controlled only at the section level. Sections read
the `lang` cookie on load (defaulting to English unless it is exactly `es`) and
update immediately on `languagechange`, including their backgrounds, spacing,
and all content. Sections loaded later read the saved cookie.

Put each language's content in its own section. All blocks inside follow their
parent section without individual language checks or re-decoration. The `en`
and `es` classes on individual blocks no longer affect language visibility;
move those language styles to Section Metadata instead. Sections containing a
`Language Toggle` block are automatically excluded from language filtering,
even if marked `en` or `es`, so the control remains accessible. This keeps the
entire containing section visible. Use `shared` for other content that should
remain visible in both languages.

## Language toggle

A `Language Toggle` block containing a bulleted list of `EN` and `ES` renders
keyboard-accessible buttons. Clicking one updates the selected pill and saves
`lang=en` or `lang=es` for one year, scoped to the current host and `/`
path (`SameSite=Lax`, plus `Secure` on HTTPS). The selection is restored from
the cookie on page load; without a matching cookie, the first item is selected.
After a successful save, the block dispatches a `languagechange` event on
`document` with `detail: { lang }`, updating localized sections immediately.
No page reload or navigation is needed; the block does not translate content.

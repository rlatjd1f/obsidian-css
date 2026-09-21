# AGENTS.md

## Project Context

This workspace is an Obsidian vault at `/Users/sion/md_house`.

The active Obsidian theme is `Things` **v2.2.4**, installed at:

- `.obsidian/themes/Things/theme.css`
- `.obsidian/themes/Things/manifest.json`
- `.obsidian/themes/Things/LICENSE`

The Things theme is tracked in git so a fresh clone reproduces the exact base
the snippet is written against. Upstream is
<https://github.com/colineckert/obsidian-things> (MIT, Copyright (c) 2020-2021
Stephan Ango). If the theme is ever updated, re-check the snippet: overrides
here depend on Things' variable names and on `--color-base-*` values.

A `Prism` theme is also installed locally but is unused and untracked.

The customization target is the CSS snippet:

- `.obsidian/snippets/mystyle.css`

Obsidian is already configured to load this snippet via `.obsidian/appearance.json`:

- `cssTheme`: `Things`
- `enabledCssSnippets`: includes `mystyle`

## Primary Goal

Customize the vault's appearance by editing `.obsidian/snippets/mystyle.css` on top of the Things theme.

Prefer CSS overrides in `mystyle.css` instead of editing `.obsidian/themes/Things/theme.css`, so the base theme can remain updateable and recoverable.

## Working Rules

- Treat `.obsidian/themes/Things/theme.css` as reference material unless the user explicitly asks to modify the theme itself.
- Make visual changes in `.obsidian/snippets/mystyle.css`.
- Keep overrides scoped and readable. Group related rules with short comments.
- Prefer overriding Things/Obsidian CSS variables when possible before using highly specific selectors.
- Avoid broad `!important` usage. Use it only when Obsidian or the theme requires it and a normal cascade override does not work.
  - Known exception: the settings-modal white theme block (the `.modal.mod-settings` / `.modal:has(.vertical-tab-container)` rules in `mystyle.css`) relies on `!important` throughout, because Obsidian applies competing inline and high-specificity styles there. That block accounts for most of the file's `!important` declarations; treat it as an established exception rather than a precedent for new rules elsewhere.
- Preserve both light and dark mode behavior unless the user asks for one mode only.
  - When pinning a **foreground** color (text, caret, icon), pin the matching **background** in the same rule, or scope the rule with `.theme-dark` / `.theme-light`. Things derives form-field and surface colors from `--color-base-*`, which invert between modes (e.g. `--color-base-25` is `#2c313c` dark / `#f0f0f0` light), so a lone `color: #ffffff` silently becomes white-on-white after a mode switch.
- Do not remove `mystyle` from `.obsidian/appearance.json`.
- Do not rename the `Things` theme folder or the `mystyle.css` snippet file unless explicitly requested.
- **기존 기능 및 스타일 회귀(Regression) 방지**: 새로운 수정사항을 적용할 때 기존에 구현된 기능, 키보드 네비게이션(커서 이동), 줄바꿈/여백, 설정창 화이트 테마 등 이미 정상 작동하는 요소들이 깨지거나 부작용이 발생하지 않도록 영향 범위를 신중히 검토하고 정밀하게 스코프를 제한하여 수정해야 한다.

## Useful Reference Points

Things defines many customization variables on `body`, including:

- `--base-h`, `--base-s`, `--base-d`, `--base-l`
- `--accent-h`, `--accent-s`, `--accent-d`, `--accent-l`
- `--h1-color` through `--h6-color`
- `--strong-color`, `--em-color`, `--quote-color`
- `--line-width`, `--line-height`
- `--code-background-l`, `--code-background-d`
- `--code-block-background-l`, `--code-block-background-d`

For mode-specific overrides, use Obsidian's theme classes:

```css
.theme-light {
  /* light mode overrides */
}

.theme-dark {
  /* dark mode overrides */
}
```

For general snippet structure, prefer:

```css
/* Headings */

/* Editor */

/* Reading view */

/* Links and tags */

/* Code blocks */

/* Sidebar and navigation */
```

## Verification

After editing CSS, check:

- `.obsidian/snippets/mystyle.css` is still valid CSS.
- `.obsidian/appearance.json` still enables `mystyle`.
- Changes are implemented as snippet overrides, not accidental edits to the base Things theme.

## Liz Collector Documentation

Liz Collector analysis documents live under:

- `/Users/sion/md_house/liz_collector`

When creating or updating Liz Collector documentation:

- Keep documents organized by the existing numbered process-flow directories, such as `001-startup`, `004-message`, `005-monitoring`, and `009-shutdown`.
- Prefer **class-level Markdown files** first. Create method-level files only when a method needs separate explanation.
- Include concise code excerpts where they clarify the runtime flow.
- Add a `## 🔗 연관 문서` section to each new or substantially updated document.
- Link related documents inside the Markdown body whenever one concept depends on another. For example, link parser docs to `CollectorLizMessage`, CDO reload docs to `CdoLoader`, monitor docs to `MonitorService`, and alarm docs to `AlarmLoadService` or `AlarmCheckService`.
- After moving or renaming documents, update all affected relative links and verify that linked `.md` files exist.

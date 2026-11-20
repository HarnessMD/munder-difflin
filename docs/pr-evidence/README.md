# PR evidence — screenshots

Before/after screenshots for pull request evidence, served to the PR body via
`raw.githubusercontent.com` (the API cannot produce GitHub's drag-and-drop
`user-attachments` URLs, so the raw CDN is the only scriptable path).

- `before-en.png` — the UI in English before the change.
- `after-zh.png` — the same screen with 简体中文 selected in Settings → General.
- `before-task-id.png` / `after-task-id.png` — the Tasks kanban DOING column
  without and with the task id on each card (#352). Rendered off the real
  `TaskCard` component with the real design tokens and bundled fonts, at one
  window size against one fixed set of cards, so the pair differs only by the
  change itself.
- `before-task-id-detail.png` / `after-task-id-detail.png` — the task DETAIL view
  without and with the id in its fact row (#352). Same approach: the real
  `TaskDetail`, real tokens and fonts, real English strings, one fixed task.
- `before-topic-tiles.png` / `after-topic-tiles.png` — the tile grid on
  /blog/topics/ at 1280px wide: the live page (topic name on a flat colour)
  and the local build with the drawn tile images.
- `before-blog-mg-kit.png` / `after-blog-mg-kit.png` — /blog/assets/mg/demo.html before the blog scene kit
  (the live site has no such page) and after (every kit scene on its still frame, from the local files).
- `before-one-click-hero.jpg` / `after-one-click-hero-menu.jpg`: the landing hero at 1440 by 900 on a Mac
  before (one button to harnessmd.com/download) and after (the split button, its arrow opened: every build read
  from the release folder, with sizes). Local files served from docs/, the live release folder.
- `after-one-click-note-mac.jpg`, `after-one-click-note-windows.jpg`, `after-one-click-note-linux.jpg`: the card a
  click opens while the installer downloads, with that system's install steps. Windows and Linux are the same page
  with that system's user agent.
- `after-one-click-menu-dark.jpg`: the menu in dark mode.
- `before-one-click-pricing.jpg` / `after-one-click-pricing.jpg`: /pricing.html before, and after Download free.

## site/pricing-060: the pricing page with today's prices, in the landing page's style

- `before-pricing-060-desktop.jpg` / `before-pricing-060-phone.jpg`: /pricing.html before, with the old $20 for 30
  days and $150 for 365 days Pro, paid once through Razorpay.
- `after-pricing-060-desktop.jpg`: the new page at 1440 wide: Free, Pro, Max and Teams, monthly first, the Cloud
  Office parts, the $19 top up and how paying works.
- `after-pricing-060-dark.jpg`: the same page in dark mode.
- `after-pricing-060-phone.jpg`: the same page at 390 wide.

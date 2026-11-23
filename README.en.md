# dsh-session-switch

> Ctrl+Tab for DSH Desktop: bounce between the current session and the previous one.

English | [中文](README.md)

[![npm](https://img.shields.io/npm/v/dsh-session-switch?color=2F6FED)](https://www.npmjs.com/package/dsh-session-switch)
[![license](https://img.shields.io/npm/l/dsh-session-switch)](LICENSE)

![icon](icon.svg)

## What it does

Press **Ctrl+Tab** on DSH Desktop to toggle between the two most recently viewed sessions:

```
Session A  --Ctrl+Tab-->  Session B  --Ctrl+Tab-->  Session A  --Ctrl+Tab-->  Session B ……
```

Same feel as switching browser tabs: it keeps bouncing between those two and never walks further back to a third or fourth session.

- **First press** returns to the session you were just viewing; the next press comes back, and so on.
- **Pick another session by hand** and the rule still holds: one press returns you to where you just were.
- **The previous session was archived or no longer exists** — it falls back to the most recently updated session.
- **Right after a page refresh** it does not know the previous session yet, so the first press goes to the most recently updated one.
- **Sitting on a blank New Session page** also jumps to the most recently updated session (blank pages are not remembered).

## Install

Published on npm as `dsh-session-switch@1.0.1`. Pick one:

```powershell
# 1) install the npm package (recommended)
plugin_manager install_bundle --target dsh-session-switch

# 2) search "Session switcher" in the plugin market

# 3) link a local checkout if you want to modify the code (hot-reloads on save)
plugin_manager install_bundle --target D:\GithubRepository\dsh-session-switch
```

It is live right after installation — no restart needed. To remove:

```powershell
plugin_manager remove_bundle --target dsh-session-switch
```

## Platform support

| Environment | Result |
|---|---|
| Windows Desktop | Ctrl+Tab bound by default; rebind under Settings → Keyboard shortcuts |
| macOS Desktop | No default binding: ⌘+Tab is taken by the system app switcher, so the app never sees it. Rebind another combination in the shortcut settings |
| Linux Desktop | No default binding: Tab is treated as reserved on Linux. Rebind another combination in the shortcut settings |
| Web browser | No default binding: Tab is a browser-reserved key and the shortcut service refuses it. The command still appears in the shortcut list and can be rebound |

## How it works

1. Registers one command with the official shortcut service: `dsh-session-switch.previous`, defaulting to `{ code: 'Tab', modifiers: ['primary'] }` on Windows Desktop.
2. Subscribes to the session list, watching which session the main view retains; when the main view changes, the old one becomes "the previous session".
3. On activation it calls `ctx.uiWorkspace.openSession(id)` — the same navigation path a sidebar click uses, so drafts, the right sidebar, and history loading stay owned by the host.

It does not listen to `keydown` itself: on Desktop, keystrokes go through the Electron main process first and only combinations registered in the official command catalog are forwarded to the page.

## Files

| File | Purpose |
|---|---|
| `client.js` | Browser half: registers the command, remembers the previous session, performs the switch |
| `index.js` | Host half, an empty shell (no service, route, or storage needed) |
| `cordis.patch.yml` | Inserts the plugin row |
| `locale/*.json` | Title and description shown in the plugin list |
| `icon.svg` | Plugin icon |

## Compatibility

`engines.dsh` declares `>=0.2.1-rc.2 <0.3.0`; developed and verified against v0.2.1-rc.3.

## License

[MIT](LICENSE)

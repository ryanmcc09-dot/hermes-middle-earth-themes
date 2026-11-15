# Middle-earth Themes for Hermes Desktop

Four animated themes, one plugin. Each paints an original illustrated scene behind the whole app, with a light and a dark version, a decorative title, and a short line from the books under it.

| Theme | Dark mode | Light mode |
|---|---|---|
| **The Shire** · `shire-hearth` | Twilight hills, a round green door, windmill, chimney smoke, fireflies | Bright morning, butterflies and birds |
| **Rivendell** · `rivendell-vale` | Blue-violet dusk, waterfall, lit Elven terraces and bridge, falling leaves | Amber autumn morning |
| **Moria** · `moria-gate` | Starlit silver-runed doors beside a black lake, campfire, embers | Pale pre-dawn mist |
| **Lothlórien** · `lothlorien-glade` | Hushed night under giant mallorn trees, silver lanterns, motes of light | Sunlit golden-green wood, god-rays |

The scene is at full strength on an empty chat. Once a conversation starts it stays visible (about half strength), and the assistant's replies sit on a soft translucent backing so the words stay easy to read. That backing is dark in dark mode and light in light mode.

**Two voices:** the assistant reads in a book serif (Palatino Linotype / Palatino / Georgia, all system fonts), while your own messages and the text box keep the app's clean sans. Code stays monospace. To change the assistant font, edit `ASSISTANT_FONT` at the top of `src/shell.js` and rebuild.

## Principles (enforced by tests)

- **Nothing reacts to your mouse.** No pointer, mouse, touch or wheel listener is ever registered. Motion is ambient only.
- **No network, no storage, no tools, no credentials, no conversation reads.** All art is drawn locally on a canvas; the one font is embedded.
- **Respects your system.** Reduced-motion gives one still frame. The scene pauses when the window is hidden. 24 fps cap, device-pixel-ratio cap of 1.5.
- **Clean lifecycle.** One canvas at a time, swapped when you change theme, completely removed when you switch away or disable the plugin. A scene that fails to start leaves nothing behind.

## Install (do this on every computer where you run the Desktop app)

Desktop plugins live on the **computer that runs the Desktop app**, not on a remote Hermes backend. Install once per machine; then each machine can pick its own theme (**Settings → Appearance → Theme**).

### Option A: from Git (best for updates)

1. In Hermes: **Capabilities → Plugins → Install from Git**.
2. Paste `https://github.com/ryanmcc09-dot/hermes-middle-earth-themes`, click **Review repository**, then install.
3. **Flip the plugin's Desktop switch on.** Plugins installed from a package start switched off; this is the step people miss.
4. Pick a theme under **Settings → Appearance → Theme**, or type `/skin rivendell-vale` in the message box.

Terminal alternative: `hermes plugins install ryanmcc09-dot/hermes-middle-earth-themes`

The repository is public, so no GitHub login is needed, but the machine does need `git` installed. If that is a hassle on a given machine, use Option B.

Update later: `hermes plugins update hermes-middle-earth-themes`

### Option B: manual copy (no Git needed)

1. Get `middle-earth-themes.zip` (run `python3 tools/pack.py`, or copy `desktop/plugin.js` yourself).
2. In Hermes: **Capabilities → Plugins → Open Desktop plugins folder**.
3. Put a folder named `middle-earth-themes` there containing `plugin.js`.
4. If it doesn't appear, **Ctrl+K (Cmd+K on Mac) → Reload desktop plugins**, then choose a theme.

Theme names for `/skin`: `shire-hearth`, `rivendell-vale`, `moria-gate`, `lothlorien-glade`. To go back: choose any other theme.

> Open a **new, empty chat** to see a scene at full strength. In an existing conversation it is deliberately dimmed.

## Repository layout

```
plugin.yaml                  manifest (desktop-only plugin)
desktop/plugin.js            GENERATED single-file plugin: all four themes (this is what gets installed)
src/shell.js                 shared theme CSS, theme registry, scene lifecycle (one canvas, swap on switch)
src/scenes/<name>.js         one original scene per theme: exactly one top-level createXScene function
themes/<id>/theme.json       label, description, quotes, factory name, optional sidebarScrim
themes/<id>/palette.json     light + dark key colors (the rest is derived and contrast-checked)
assets/fonts/                Cinzel Decorative (SIL OFL), embedded at build time
tools/build.py               builds desktop/plugin.js; fails on bad contrast or scene rule violations
tools/check.sh               build is current + all tests
tools/pack.py                makes dist/middle-earth-themes.zip for manual installs
tests/                       scene contract, plugin lifecycle
```

`desktop/plugin.js` is generated: edit `src/` and `themes/`, then run `python3 tools/build.py`.

## Development

```sh
python3 tools/build.py     # rebuild desktop/plugin.js
sh tools/check.sh          # build is current, scene contract, plugin lifecycle
```

The scene contract (`tests/scene-contract.cjs`) is run against every scene and fails if a scene:
registers any pointer-like listener, uses network/storage/audio/image APIs, exceeds the DPR or frame cap, rebuilds its cached art per frame, keeps animating when hidden or under reduced motion, or leaves any listener, observer or animation callback behind after `destroy()` or after a failed start.

### Adding a theme

1. Write `src/scenes/<name>.js`: one top-level `function createXScene(canvas, options)` returning `{ draw, refresh, stats, destroy }` (copy an existing scene's structure and its safe-startup/teardown pattern). Keep the upper-middle of the canvas calm: the title sits there.
2. Add `themes/<id>/theme.json` and `palette.json` (light and dark `background`, `foreground`, `primary`, `mutedForeground`, `border`, `card`).
3. Add the theme to `ORDER` in `tools/build.py` and the scene to the table in `tests/scene-contract.cjs`.
4. `sh tools/check.sh`, then look at it in the real app in both modes at a wide and a narrow window.

## Troubleshooting

- **The scene shows but replies have no backing panel, the text is in the app's usual font, and the scene looks very bright.** The theme's stylesheet isn't being applied. Version 1.0.0 relied on Desktop to apply the stylesheet through the theme's `customCSS` field, which some Desktop versions don't do for plugin-contributed themes. **Since 1.0.1 the plugin installs its own stylesheet** (a `<style id="middle-earth-theme-css">` tag, present only while one of these themes is active). Update `plugin.js` to 1.0.1 or later and reload (**Ctrl+K → Reload desktop plugins**).
- While one of these themes is active, the page root carries `data-me-version="<version>"`, so a developer-tools inspection shows which version is running.

## What was and wasn't verified

- Readability was **measured**, not eyeballed: for every text line in a realistic conversation, the real text color was compared (WCAG contrast) against the scene pixels directly behind it, for all four themes in both modes. With the stylesheet applied, **0% of those pixels fall below 4.5:1 and the worst 5% are at 8.1:1 or better.** With the stylesheet missing (scene at full strength, no backing), 34.5% of the pixels behind the text in Lothlórien dark fall below 4.5:1, so the backing is doing real work.
- Verified: all scenes pass the contract; the built plugin passes the lifecycle test; the contract test was checked against deliberately planted defects (a mouse listener, a missing startup rollback) and fails on both; all eight theme × mode combinations were viewed in an isolated build of the real Hermes Desktop interface with the shared theme CSS applied.
- Not verified: installation on a separate native Desktop app (Windows or otherwise); behaviour on the real backend-driven new-chat screen (the test build had no backend, so the empty-chat element was simulated); real-display frame pacing (scene logic holds 24 fps in simulation; the headless test browser could not show true display rate).
- The scenes' selectors for app chrome (`data-slot` hooks and a few Tailwind class names for the top bar and window controls) are not a public API. If a Desktop update renames them, those touches fall back to the plain palette; the scenes themselves keep working.

## Credits and legal

Original artwork; unofficial fan project, not affiliated with the Tolkien Estate, any film studio or publisher, Nous Research or the Hermes Agent project. Quotes are short lines from Tolkien's books. The whole-window theme approach is informed by [Borealis](https://github.com/Adolanium/hermes-borealis) (MIT). Headings use Cinzel Decorative (SIL OFL). Full notices: `THIRD-PARTY-NOTICES.txt`.

## License

**CC0 1.0 Universal (public domain dedication)** for everything original here: code, scenes, palettes, tests, tools and docs. Use it for anything, no permission or credit needed. See `LICENSE`.

CC0 does not cover other people's rights, which stay as they are: the **Tolkien quotations** and the **names/marks** (Middle-earth and others) belong to their owners, the **font** is under the SIL OFL, and the parts modeled on **Borealis** keep its MIT notice. Details, including how to remove the quotes if you want to reuse this commercially, are at the top of `THIRD-PARTY-NOTICES.txt`.

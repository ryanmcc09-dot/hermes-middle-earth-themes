/* Middle-earth Themes for Hermes Desktop.
 * One plugin, four themes (Shire, Rivendell, Moria, Lothlorien). Each theme paints its own
 * original Canvas2D scene behind the app; only the active theme's scene runs.
 * The whole-window approach is informed by Borealis (MIT), https://github.com/Adolanium/hermes-borealis
 * See THIRD-PARTY-NOTICES.txt. No network, tools, permissions, telemetry, mouse tracking,
 * or conversation-content reads. Not affiliated with the Tolkien Estate or any studio.
 *
 * GENERATED FILE: edit src/ and themes/, then run `python3 tools/build.py`.
 */
import { THEMES_AREA } from '@hermes/plugin-sdk'

const FONT_FAMILY = '"Middle-earth Decorative"'
// Two voices: the assistant reads in a book serif (system fonts, nothing to download), while your own
// messages and the text box keep the app's clean sans. Code stays monospace everywhere.
const ASSISTANT_FONT = '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
const FONT_CSS = "@font-face{font-family:'Middle-earth Decorative';src:url(data:font/woff2;base64,__FONT_B64__) format('woff2');font-style:normal;font-weight:400;font-display:swap}"
const THEME_DATA = __THEME_DATA__
const MAKERS = __MAKERS__

const makeCSS = (name, scrim = 0.64, veilLight = '#ffffff', veilDark = '#000000') => {
  const T = `:root:is([data-hermes-theme="${name}"], [data-hermes-theme^="${name}-accent-"])`
  return `
${FONT_CSS}
${T} {
  isolation: isolate;
  background-color: var(--ui-bg-chrome) !important;
  --ui-chat-surface-background: transparent !important;
  --ui-sidebar-surface-background: transparent !important;
  --ui-editor-surface-background: transparent !important;
  --ui-terminal-surface-background: var(--ui-bg-chrome);
  --me-rule: color-mix(in srgb, var(--theme-midground) 30%, transparent);
  --me-halo: color-mix(in srgb, var(--ui-bg-chrome) 82%, transparent);
}
${T} body, ${T} #root, ${T} [data-contrib-shell], ${T} [data-slot="sidebar-wrapper"],
${T} [data-slot="sidebar"], ${T} [data-slot="sidebar-inner"], ${T} [data-slot="bots-roster"],
${T} [data-chat-surface], ${T} [data-slot="composer-bounds"], ${T} [data-slot="aui_thread-viewport"] {
  background-color: transparent !important;
  background-image: none !important;
}
${T} [data-glass-opaque], ${T} [data-glass-raised] {
  --ui-chat-surface-background: var(--ui-bg-chrome) !important;
  --ui-editor-surface-background: var(--ui-bg-chrome) !important;
  --ui-sidebar-surface-background: var(--ui-bg-sidebar) !important;
}
/* The scene must NEVER be see-through. In Desktop's glass mode the page background is transparent and the
   native window material (Windows Mica/Acrylic) shows through any translucent paint, but only while the
   window is focused, so a half-transparent scene looked like a colored haze that vanished when the window
   lost focus. The canvas is therefore always fully opaque; calming it behind a conversation is done by a
   solid-color veil laid on top of it. */
${T} { --me-veil: ${veilLight}; }
${T}.dark { --me-veil: ${veilDark}; }
${T} canvas[data-me-scene] { opacity: 1 !important; }
${T} [data-me-veil] {
  background: var(--me-veil);
  opacity: .5;
  transition: opacity 900ms ease;
}
${T}:has([data-slot="aui_intro"]) [data-me-veil] { opacity: 0; }
${T} [data-slot="composer-surface"] {
  background: var(--ui-bg-editor) !important;
  border: 1px solid var(--me-rule) !important;
  border-radius: 12px !important;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ui-bg-chrome) 75%, transparent), 0 8px 28px #0003 !important;
}
${T} [data-slot="composer-surface"]:focus-within {
  border-color: var(--theme-midground) !important;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ui-bg-chrome) 75%, transparent), 0 0 34px color-mix(in srgb, var(--theme-midground) 22%, transparent), 0 8px 28px #0003 !important;
}
${T} [data-slot="composer-rich-input"] { caret-color: var(--theme-midground); }
${T} [data-slot="pane-tab"], ${T} [data-slot="sidebar-group-label"],
${T} [data-slot="aui_assistant-message-content"] :is(h1,h2,h3) {
  font-family: ${FONT_FAMILY}, Palatino, Georgia, serif !important;
  font-weight: 400;
  letter-spacing: .015em;
}
${T} .wordmark, ${T} .wordmark * {
  font-family: ${FONT_FAMILY}, Palatino, Georgia, serif !important;
  font-weight: 400 !important;
}
${T} .wordmark {
  width: min(calc(100% - 2rem), 44rem) !important;
  mix-blend-mode: normal !important;
  text-shadow: 0 2px 24px var(--me-halo);
}
${T} .wordmark > span:not([aria-hidden]) > span { color: var(--theme-foreground); }
${T} [data-slot="aui_intro"] p:not(.wordmark) {
  color: var(--ui-text-secondary);
  font-family: Palatino, Georgia, serif;
  font-size: 1.05rem;
  line-height: 1.65;
  max-width: 44ch;
  margin-inline: auto;
}
${T} [data-slot="aui_intro"]::after {
  content: var(--me-quote, "");
  display: block;
  margin: 1.2rem auto 0;
  width: fit-content;
  max-width: 46ch;
  padding: .5rem 1.2rem;
  border-radius: 20px;
  background: color-mix(in srgb, var(--ui-bg-chrome) 42%, transparent);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  text-wrap: balance;
  text-align: center;
  font-family: Palatino, "Palatino Linotype", Georgia, serif;
  font-style: italic;
  font-size: .98rem;
  line-height: 1.55;
  letter-spacing: .02em;
  color: var(--theme-midground);
  text-shadow: 0 1px 14px var(--me-halo);
}
${T} [data-slot="aui_assistant-message-content"] :is(p,li) { line-height: 1.75; }
/* The assistant's replies sit on a soft translucent backing, so the scene can stay bright behind the
   conversation while the words stay easy to read. Negative margin cancels the padding: no layout shift. */
${T} [data-slot="aui_assistant-message-root"] {
  margin: -.55rem -.9rem;
  padding: .55rem .9rem;
  border-radius: 16px;
  background: color-mix(in srgb, var(--ui-bg-chrome) 70%, transparent);
}
${T} [data-slot="aui_assistant-message-content"] {
  font-family: ${ASSISTANT_FONT};
  font-size: 1.04em;
}
${T} [data-slot="aui_assistant-message-content"] :is(pre, code, kbd) { font-size: .9em; }
@media (prefers-reduced-transparency: reduce) {
  ${T} [data-slot="aui_assistant-message-root"] { background: var(--ui-bg-chrome); }
}
${T} [data-slot="aui_assistant-message-content"] :is(h1,h2) {
  padding-bottom: .3em;
  background: linear-gradient(90deg, var(--me-rule), transparent 85%) left bottom / 100% 1px no-repeat;
}
${T} [data-slot="aui_assistant-message-content"] blockquote {
  border-inline-start: 2px solid var(--theme-midground);
  padding-inline-start: .9rem;
  font-family: Palatino, "Palatino Linotype", Georgia, serif;
  font-style: italic;
  color: var(--ui-text-secondary);
}
${T} [data-slot="aui_assistant-message-content"] a { text-decoration-color: color-mix(in srgb, var(--theme-midground) 55%, transparent); text-underline-offset: .2em; }
${T} [data-slot="aui_assistant-message-content"] hr { border: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--me-rule), transparent); }
${T} .composer-human-message {
  background: color-mix(in srgb, var(--theme-midground) 11%, var(--ui-bg-editor)) !important;
  border-color: var(--me-rule) !important;
  border-radius: 14px !important;
}
${T} :is(pre,code,kbd) { font-family: var(--dt-font-mono, ui-monospace, monospace) !important; }
${T} pre { background: var(--ui-bg-editor) !important; border: 1px solid var(--me-rule); border-radius: 8px; }
${T} [data-slot="sidebar"] {
  background-image: linear-gradient(90deg, color-mix(in srgb, var(--ui-bg-chrome) ${Math.round(scrim * 100)}%, transparent) 0%, color-mix(in srgb, var(--ui-bg-chrome) ${Math.round(scrim * 47)}%, transparent) 60%, transparent 100%) !important;
}
/* The sidebar scrim starts below the tab strip, so give the strip and top bar their own translucent backing:
   otherwise tab labels sit straight on the scene (dark text on a dark cliff in light mode). */
${T} :is(div[class*="group/pane-header"], div[class*="relative flex min-w-0 shrink-0 bg-(--ui-sidebar-surface-background)"]) {
  background: color-mix(in srgb, var(--ui-bg-chrome) 62%, transparent) !important;
}
/* The window controls float above everything in their own fixed container. */
${T} div[class*="fixed z-70 flex flex-row items-center"] {
  background: color-mix(in srgb, var(--ui-bg-chrome) 62%, transparent);
  border-radius: 10px;
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}
${T} [data-slot="sidebar-menu-button"][data-active="true"] {
  box-shadow: inset 2px 0 0 var(--theme-midground);
  background: color-mix(in srgb, var(--theme-midground) 10%, transparent) !important;
}
${T} [data-slot="statusbar"] { background: color-mix(in srgb, var(--ui-bg-chrome) 88%, transparent) !important; border-top: 1px solid var(--me-rule); }
${T} [data-slot="profile-rail"] { background: color-mix(in srgb, var(--ui-bg-chrome) 70%, transparent) !important; }
${T} [data-panel-header] { border-color: var(--me-rule); }
${T} [data-slot="composer-surface"] button[data-variant="default"] {
  background: var(--theme-midground) !important;
  color: var(--dt-midground-foreground) !important;
  border-radius: 8px !important;
}
${T} :is([data-slot="dropdown-menu-content"], [data-slot="dialog-content"], [data-slot="popover-content"]) {
  border-color: var(--me-rule) !important;
  border-radius: 12px !important;
}
${T} ::selection { background: color-mix(in srgb, var(--theme-midground) 38%, transparent); }
@media (max-width: 700px) { ${T} [data-slot="aui_intro"]::after { font-size: .85rem; max-width: 30ch; } }
@media (prefers-reduced-motion: reduce) { ${T} [data-me-veil] { transition: none; } }
@media (forced-colors: active) {
  ${T} :is(canvas[data-me-scene], [data-me-veil]) { display: none; }
  ${T} [data-slot="aui_intro"]::after { color: CanvasText; text-shadow: none; }
}
`
}

const THEMES = THEME_DATA.map(t => ({
  ...t,
  make: MAKERS[t.name],
  // The stylesheet is installed by this plugin itself (see watchScenes), not through the theme's
  // customCSS field. Desktop versions differ in how (or whether) they apply that field to a
  // plugin-contributed theme; owning the <style> tag makes the result identical everywhere.
  css: makeCSS(t.name, t.sidebarScrim, t.colors.background, t.darkColors.background),
  desktopTheme: {
    name: t.name,
    label: t.label,
    description: t.description,
    colors: t.colors,
    darkColors: t.darkColors
  }
}))

const resolveTheme = n => THEMES.find(t => n === t.name || n.startsWith(`${t.name}-accent-`)) || null

const setQuote = theme => {
  const style = document.documentElement.style
  const had = style.getPropertyValue('--me-quote')
  if (theme && theme.quotes && theme.quotes.length) {
    if (!had) style.setProperty('--me-quote', JSON.stringify(theme.quotes[Math.floor(Math.random() * theme.quotes.length)]))
  } else if (had) {
    style.removeProperty('--me-quote')
  }
}

const VERSION = '1.0.2'
const STYLE_ID = 'middle-earth-theme-css'

function watchScenes() {
  const root = document.documentElement
  let styleEl = null
  let stage = null
  let canvas = null
  let veil = null
  let active = null
  let failedFor = null
  let lastDark = null
  let pending = 0
  let disposed = false

  // One <style> tag, present only while one of these themes is active, holding that theme's CSS.
  const setStyle = theme => {
    if (!theme) {
      if (styleEl) styleEl.remove()
      styleEl = null
      return
    }
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      document.head.appendChild(styleEl)
    }
    if (styleEl.dataset.theme !== theme.name) {
      styleEl.dataset.theme = theme.name
      styleEl.textContent = theme.css
    }
  }

  const teardown = () => {
    if (stage) stage.destroy()
    if (canvas) canvas.remove()
    if (veil) veil.remove()
    stage = canvas = veil = active = null
    lastDark = null
  }

  function sync() {
    pending = 0
    if (disposed) return
    const theme = resolveTheme(root.dataset.hermesTheme || '')
    const dark = root.classList.contains('dark')
    if (theme !== failedFor) failedFor = null
    setStyle(theme)
    setQuote(theme)
    if (theme) root.dataset.meVersion = VERSION
    else delete root.dataset.meVersion

    // Switching between two of these themes swaps the scene; there is never more than one canvas.
    if (active && theme !== active) teardown()
    if (!theme || failedFor === theme) return

    if (!stage) {
      // Veil first, canvas second: both sit at z-index -1, and the later one in the page paints on top,
      // so the canvas lands FIRST in the DOM (below) and the veil right after it (above).
      veil = document.createElement('div')
      veil.setAttribute('aria-hidden', 'true')
      veil.dataset.meVeil = ''
      veil.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;'
      document.body.prepend(veil)
      canvas = document.createElement('canvas')
      canvas.setAttribute('aria-hidden', 'true')
      canvas.dataset.meScene = theme.name
      canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;'
      document.body.prepend(canvas)
      try {
        stage = theme.make(canvas, { dark })
        active = theme
        lastDark = dark
      } catch (error) {
        console.warn(`[middle-earth-themes] ${theme.name} scene unavailable; keeping the palette.`, error)
        canvas.remove()
        veil.remove()
        canvas = veil = stage = null
        failedFor = theme
      }
    } else if (dark !== lastDark) {
      lastDark = dark
      if (stage.refresh) stage.refresh({ dark })
    }
  }

  const observer = new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(sync) })
  observer.observe(root, { attributes: true, attributeFilter: ['data-hermes-theme', 'class', 'style'] })
  sync()

  return () => {
    disposed = true
    setStyle(null)
    delete root.dataset.meVersion
    setQuote(null)
    observer.disconnect()
    cancelAnimationFrame(pending)
    teardown()
  }
}

export default {
  id: 'middle-earth-themes',
  name: 'Middle-earth Themes',
  register(ctx) {
    for (const t of THEMES) ctx.register({ id: t.name, area: THEMES_AREA, data: t.desktopTheme })
    ctx.onDispose(watchScenes())
  }
}

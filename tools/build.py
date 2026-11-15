#!/usr/bin/env python3
"""Build desktop/plugin.js from src/shell.js + src/scenes/*.js + themes/*/ + the embedded font.

    python3 tools/build.py            # build all themes
    python3 tools/build.py --check    # build to memory and fail if desktop/plugin.js is out of date

Every scene file must define exactly one top-level function (createXScene) and have no
import/export. Palettes need fg/primary/muted text contrast >= 4.5:1 against the background.
"""
import base64, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORDER = ['shire-hearth', 'rivendell-vale', 'moria-gate', 'lothlorien-glade']


def hex_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_hex(c):
    return '#' + ''.join('%02x' % max(0, min(255, round(v))) for v in c)


def mix(a, b, t):
    """Mix a toward b by t (0..1)."""
    ca, cb = hex_rgb(a), hex_rgb(b)
    return rgb_hex([ca[i] + (cb[i] - ca[i]) * t for i in range(3)])


def lum(h):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in hex_rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def ink(c):
    return '#14120d' if lum(c) > 0.4 else '#fbf6e8'


def expand(p, kind):
    """Fill every DesktopThemeColors key from the six authored colors (explicit keys win)."""
    bg, fg, pr = p['background'], p['foreground'], p['primary']
    dark = lum(bg) < 0.4
    out = dict(p)

    def d(key, value):
        out.setdefault(key, value)

    d('card', mix(bg, fg, .05 if dark else .03))
    d('cardForeground', fg)
    d('muted', mix(bg, fg, .08 if dark else .05))
    d('popover', mix(bg, fg, .09 if dark else .04))
    d('popoverForeground', fg)
    d('primaryForeground', ink(pr))
    d('secondary', mix(bg, pr, .20 if dark else .12))
    d('secondaryForeground', fg)
    d('accent', mix(bg, pr, .26 if dark else .14))
    d('accentForeground', fg)
    d('input', mix(bg, fg, .14 if dark else .12))
    d('ring', pr)
    d('midground', pr)
    d('midgroundForeground', ink(pr))
    d('composerRing', pr)
    d('destructive', '#f39386' if dark else '#b73b34')
    d('destructiveForeground', ink(out['destructive']))
    d('sidebarBackground', mix(bg, '#000000', .18 if dark else .03))
    d('sidebarBorder', out['border'])
    d('userBubble', mix(bg, pr, .12 if dark else .10))
    d('userBubbleBorder', out['border'])

    problems = []
    for label, a in (('foreground', fg), ('primary', pr), ('mutedForeground', out['mutedForeground'])):
        ratio = contrast(a, bg)
        if ratio < 4.5:
            problems.append(f'{kind} {label} {a} on {bg} = {ratio:.2f}:1 (< 4.5)')
    return out, problems


def load_scene(theme, meta):
    src = (ROOT / 'src' / 'scenes' / f"{meta['scene']}.js").read_text()
    fn = meta['factory']
    tops = re.findall(r'^(?:async\s+)?function\s+(\w+)|^(?:const|let|var|class)\s+(\w+)', src, re.M)
    names = [a or b for a, b in tops]
    if names != [fn]:
        raise SystemExit(f'{theme}: scene must have exactly one top-level declaration {fn}; found {names}')
    if re.search(r'^\s*(import|export)\s', src, re.M):
        raise SystemExit(f'{theme}: scene must not use import/export')
    for banned in ('pointermove', 'mousemove', 'pointerdown', 'touchmove', 'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'WebSocket'):
        if banned in src:
            raise SystemExit(f'{theme}: scene source contains forbidden "{banned}"')
    return src.rstrip() + '\n'


def build():
    scenes, data, makers, problems = [], [], {}, []
    for theme in ORDER:
        tdir = ROOT / 'themes' / theme
        if not (tdir / 'theme.json').exists():
            raise SystemExit(f'missing themes/{theme}/theme.json')
        meta = json.loads((tdir / 'theme.json').read_text())
        pal = json.loads((tdir / 'palette.json').read_text())
        light, pl = expand(pal['light'], f'{theme} light')
        dark, pd = expand(pal['dark'], f'{theme} dark')
        problems += pl + pd
        scenes.append(f"/* ───── scene: {theme} ───── */\n" + load_scene(theme, meta))
        makers[theme] = meta['factory']
        data.append({
            'name': theme, 'label': meta['label'], 'description': meta['description'],
            'quotes': meta['quotes'], 'colors': light, 'darkColors': dark,
            **({'sidebarScrim': meta['sidebarScrim']} if 'sidebarScrim' in meta else {}),
        })
    if problems:
        raise SystemExit('Palette contrast failures:\n  ' + '\n  '.join(problems))

    font = base64.b64encode((ROOT / 'assets/fonts/CinzelDecorative-Regular-latin.woff2').read_bytes()).decode()
    shell = (ROOT / 'src' / 'shell.js').read_text()
    for token in ('__FONT_B64__', '__THEME_DATA__', '__MAKERS__'):
        assert token in shell, token
    shell = shell.replace('__FONT_B64__', font)
    shell = shell.replace('__THEME_DATA__', json.dumps(data, ensure_ascii=False, indent=2))
    maker_js = '{\n' + ',\n'.join(f"  '{k}': {v}" for k, v in makers.items()) + '\n}'
    shell = shell.replace('__MAKERS__', maker_js)
    # Banner comment stays first; scenes precede the shell (the import is hoisted by the module loader).
    head, rest = shell.split('import { THEMES_AREA }', 1)
    return head + '\n'.join(scenes) + '\nimport { THEMES_AREA }' + rest


def main():
    out = build()
    target = ROOT / 'desktop' / 'plugin.js'
    if '--check' in sys.argv:
        if not target.exists() or target.read_text() != out:
            raise SystemExit('desktop/plugin.js is out of date: run python3 tools/build.py')
        print('desktop/plugin.js is up to date')
        return
    target.write_text(out)
    (ROOT / 'desktop' / 'THIRD-PARTY-NOTICES.txt').write_text((ROOT / 'THIRD-PARTY-NOTICES.txt').read_text())
    chk = subprocess.run(['node', '--check', str(target)], capture_output=True, text=True)
    if chk.returncode:
        raise SystemExit('node --check failed:\n' + chk.stderr)
    print(f'built {target.relative_to(ROOT)}: {len(out.encode()):,} bytes, {len(ORDER)} themes, syntax OK')


if __name__ == '__main__':
    main()

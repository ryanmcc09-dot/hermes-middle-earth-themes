#!/usr/bin/env python3
"""Make dist/middle-earth-themes.zip for MANUAL installs (no Git needed on the target machine).

Unzip, then copy the `middle-earth-themes` folder into Hermes Desktop's plugins folder
(Capabilities > Plugins > Open Desktop plugins folder).
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
out = ROOT / 'dist' / 'middle-earth-themes.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(ROOT / 'desktop' / 'plugin.js', 'middle-earth-themes/plugin.js')
    z.write(ROOT / 'THIRD-PARTY-NOTICES.txt', 'middle-earth-themes/THIRD-PARTY-NOTICES.txt')
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
print(f'wrote {out.relative_to(ROOT)}: {out.stat().st_size:,} bytes')

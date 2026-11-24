"""Phase 1: Fundament in index.html einspielen (einmalig ausgeführt, zur Nachvollziehbarkeit abgelegt).
- Favicon (data-URI) und Inter 400/500/600 latin (data-URI, kein CDN, CSP bleibt unverändert)
- tailwind.config: Theme aus docs/design-transfer/tokens/tailwind.config.ts + bestehende App-Animationen
- docs/design-transfer/tokens/index.css als <style type="text/tailwindcss">
"""
import base64, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[3]
inter = pathlib.Path(sys.argv[1])  # Ordner web-latin aus inter-ui@4.1.1
html_p = root / 'index.html'
s = html_p.read_text(encoding='utf-8')

fav = base64.b64encode((root / 'docs/design-transfer/assets/favicon.svg').read_bytes()).decode()
faces = []
for w, f in [(400, 'Inter-Regular-subset.woff2'), (500, 'Inter-Medium-subset.woff2'), (600, 'Inter-SemiBold-subset.woff2')]:
    b = base64.b64encode((inter / f).read_bytes()).decode()
    faces.append(f'        @font-face {{ font-family: "Inter"; font-style: normal; font-weight: {w}; font-display: swap; src: url(data:font/woff2;base64,{b}) format("woff2"); }}')

head_add = f'''    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,{fav}">
    <!-- n.Org Designsystem: Inter (SIL OFL 1.1, inter-ui 4.1.1, Latin-Untermenge) eingebettet, kein CDN nötig -->
    <style>
{chr(10).join(faces)}
    </style>
'''
old_title = '    <title>Niederwieser Performance Manager v93 - Production Hardening</title>\n'
assert old_title in s
s = s.replace(old_title, '    <title>Performance Manager · Niederwieser</title>\n' + head_add, 1)

# tailwind.config ersetzen
cfg_re = re.compile(r"        tailwind\.config = \{\n.*?\n        \};\n", re.S)
assert len(cfg_re.findall(s)) == 1
tokens_ts = (root / 'docs/design-transfer/tokens/tailwind.config.ts').read_text(encoding='utf-8')
theme = tokens_ts[tokens_ts.index('  theme: {'):tokens_ts.index('  plugins: [],')]
theme = theme.rstrip().rstrip(',')
# bestehende App-Animationen (animate-in / animate-out) auf die n.Org-Keyframes legen
theme = theme.replace("      animation: {\n", "      animation: {\n        // App-Bestand: animate-in / animate-out (vorher eigene Keyframes) → n.Org pop-in / pop-out\n        in: 'pop-in .18s cubic-bezier(.2,.8,.2,1) both',\n        out: 'pop-out .12s ease-in both',\n", 1)
theme = '\n'.join(('        ' + l) if l.strip() else l for l in theme.splitlines())
new_cfg = "        // n.Org Designsystem – Tokens aus docs/design-transfer/tokens/tailwind.config.ts (Tailwind 3)\n        tailwind.config = {\n" + theme + "\n        };\n"
s = cfg_re.sub(lambda m: new_cfg, s, count=1)

# index.css als text/tailwindcss (die @tailwind-Direktiven fügt das Play-CDN selbst ein)
css = (root / 'docs/design-transfer/tokens/index.css').read_text(encoding='utf-8')
css = re.sub(r'@tailwind (base|components|utilities);\n', '', css).strip()
css = '\n'.join(('        ' + l) if l.strip() else l for l in css.splitlines())
tw_style = '    <!-- n.Org Designsystem – docs/design-transfer/tokens/index.css -->\n    <style type="text/tailwindcss">\n' + css + '\n    </style>\n\n'
anchor = '    <style>\n        body { -webkit-font-smoothing: antialiased; }'
assert s.count(anchor) == 1
s = s.replace(anchor, tw_style + anchor, 1)

html_p.write_text(s, encoding='utf-8')
print('ok')

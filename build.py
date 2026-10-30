# Собирает index.html из экранов src/screens/*.html (экспорт из Paper)
# и обновляет список файлов для офлайн-кэша в sw.js.
import os, re, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
SCREENS = os.path.join(ROOT, 'src', 'screens')
ASSET_RE = re.compile(r'https://app\.paper\.design/file-assets/[^/]+/([A-Z0-9]+\.(?:png|jpg|jpeg|webp|svg))')

sections = []
for name in sorted(os.listdir(SCREENS)):
    if not name.endswith('.html'):
        continue
    sid = name[:-5]
    html = open(os.path.join(SCREENS, name), encoding='utf-8').read()
    html = ASSET_RE.sub(lambda m: 'assets/' + m.group(1), html)
    # корневой фрейм экрана растягиваем на высоту устройства
    html = html.replace('height: 844px;', 'height: 100%;', 1)
    sections.append(f'<section class="screen" id="s-{sid}" hidden>{html}</section>')


# офлайн-кэш: все файлы приложения + версия по хэшу содержимого
files = ['./', 'index.html', 'app.js', 'app.css', 'manifest.webmanifest', 'fonts/inter.css']
for d in ('assets', 'fonts', 'icons'):
    for f in sorted(os.listdir(os.path.join(ROOT, d))):
        p = f'{d}/{f}'
        if p not in files and not f.startswith('.'):
            files.append(p)
h = hashlib.sha1('\n'.join(sections).encode())
for f in files[2:]:
    h.update(open(os.path.join(ROOT, f), 'rb').read())
ver = h.hexdigest()[:10]

# версия в ссылках, чтобы Safari не держал старые app.js/app.css
tpl = open(os.path.join(ROOT, 'src', 'index.tpl.html'), encoding='utf-8').read()
for ref in ('app.js', 'app.css', 'fonts/inter.css'):
    tpl = tpl.replace(f'"{ref}"', f'"{ref}?v={ver}"')
out = tpl.replace('<!--SCREENS-->', '\n'.join(sections))
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(out)
sw = open(os.path.join(ROOT, 'src', 'sw.tpl.js'), encoding='utf-8').read()
sw = sw.replace('__VERSION__', ver).replace('__FILES__', ',\n  '.join(f"'{f}'" for f in files))
open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf-8').write(sw)
print(f'{len(sections)} экранов, {len(files)} файлов в кэше, версия {ver}')

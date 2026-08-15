# -*- coding: utf-8 -*-
"""
사진 확인을 한 줄로 만든다.

    python3 scripts/photo-audit.py <슬러그>

하는 일:
  1) 그 장소의 사진을 한 장의 대조표로 붙여 /tmp/photo-audit.png 로 저장
  2) 파일마다 픽셀 지표(하늘·초록·단풍색·밝음)를 계산해 표로 출력
  3) 등재명과 요청 키워드를 나란히 보여 준다
  4) 대장에 붙여 넣을 JSON 뼈대를 출력한다

그 다음은 사람이든 에이전트든 **반드시 /tmp/photo-audit.png 를 실제로 열어야 한다.**
이 스크립트는 보는 일을 대신하지 않는다. **보는 일을 쉽게 만들 뿐이다.**

왜 이렇게까지 하나 (2026-08-15).
  하루에 오매칭을 아홉 번 걸렀고 아홉 번 다 '열어 봤기 때문에' 걸렀다.
  자동화의 유일한 벽이 이것이었다. 벽을 없애는 방법은 검사를 빼는 것이 아니라
  **검사를 명령 한 줄로 줄이는 것**이다.
"""
import json, io, sys, glob, os
from PIL import Image, ImageDraw

OUT = '/tmp/photo-audit.png'
SAMPLE = 96

def measure(path):
    im = Image.open(path).convert('RGB'); im.thumbnail((SAMPLE, SAMPLE))
    hsv = im.convert('HSV'); px = list(hsv.getdata()); w, h = hsv.size
    n = len(px) or 1; top = w * (h // 3) or 1
    warm = green = bright = sky = 0
    for i, (H, S, V) in enumerate(px):
        hue = H * 360 / 255.0; s, v = S / 255.0, V / 255.0
        if s > 0.28 and v > 0.25 and (hue <= 45 or hue >= 345): warm += 1
        if s > 0.22 and 70 <= hue <= 165: green += 1
        if v > 0.78 and s < 0.18: bright += 1
        if i < top and s > 0.12 and v > 0.5 and 175 <= hue <= 255: sky += 1
    return dict(warm=warm/n, green=green/n, bright=bright/n, sky=sky/top)

def hint(m):
    """지표에서 읽히는 것을 한 마디로. 판정이 아니라 힌트다."""
    if m['sky'] < 0.03 and m['green'] < 0.08:
        return '실내일 수 있음'
    if m['warm'] >= 0.15 and m['warm'] > m['green']:
        return '단풍·석양 계열'
    if m['bright'] >= 0.20 and m['green'] < 0.10:
        return '설경·역광 계열'
    if m['green'] >= 0.30:
        return '초록 (여름·봄)'
    return '실외 일반'

def main():
    if len(sys.argv) < 2:
        print('사용법: python3 scripts/photo-audit.py <슬러그>'); return 2
    slug = sys.argv[1]

    files = sorted(glob.glob(f'src/assets/images/**/{slug}-*.jpg', recursive=True))
    if not files:
        print(f'{slug} — 사진이 없습니다.'); return 1

    places = json.load(io.open('data/place-images.json', encoding='utf-8'))['places']
    pl = next((p for p in places if p['slug'] == slug), None)

    print(f'\n■ {slug}')
    if pl:
        kw, ti = pl.get('keyword', ''), pl.get('title', '')
        flag = '' if kw.replace(' ', '') == ti.replace(' ', '') else '   ⚠ 요청과 등재명이 다릅니다'
        print(f'  요청 키워드 : {kw}')
        print(f'  실제 등재명 : {ti}{flag}')
        print(f'  주소        : {pl.get("address", "")}')
    print(f'  사진        : {len(files)}장\n')

    TW, TH, cols = 300, 205, min(6, len(files))
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols*TW, rows*(TH+18)), '#fffdfa')
    d = ImageDraw.Draw(sheet)
    print('  파일                     단풍   초록   밝음   하늘   읽히는 것')
    print('  ' + '-'*66)
    for i, p in enumerate(files):
        im = Image.open(p).convert('RGB'); im.thumbnail((TW, TH))
        sheet.paste(im, ((i%cols)*TW+(TW-im.width)//2, (i//cols)*(TH+18)+(TH-im.height)//2))
        d.text(((i%cols)*TW+4, (i//cols)*(TH+18)+TH+2), os.path.basename(p)[:-4][:26], fill='#12100f')
        m = measure(p)
        print(f"  {os.path.basename(p):24} {m['warm']:5.0%} {m['green']:6.0%} "
              f"{m['bright']:6.0%} {m['sky']:6.0%}   {hint(m)}")
    sheet.save(OUT)

    print(f'\n  ▶ 대조표: {OUT}')
    print('  ▶ **반드시 이 그림을 실제로 열어 보십시오.** 지표는 힌트일 뿐입니다.')
    print('    이름이 맞아도 내용이 다른 경우가 있었습니다 —')
    print("    '내장산 단풍생태공원' 은 이름이 정확했고 사진은 초록 여름 공원이었습니다.\n")
    print('  본 뒤 data/photo-verified.json 에 추가하십시오:\n')
    print(f'    "{slug}": {{')
    print(f'      "verifiedAt": "YYYY-MM-DD",')
    print(f'      "note": "각 사진에 무엇이 찍혀 있는지. 최소 한 줄. 다른 것이 있으면 그것부터."')
    print(f'    }}\n')
    return 0

if __name__ == '__main__':
    sys.exit(main())

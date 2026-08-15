# -*- coding: utf-8 -*-
"""
사진 오매칭 자동 검수 — 2층: 사진 안을 본다.

1층(photo-sanity.mjs)은 **이름**을 본다. 그것으로 여덟 번 중 여섯 번을 잡는다.
그런데 두 번은 이름이 맞았는데 내용이 달랐다.

  '내장산 단풍생태공원' — 등재명 정확. 사진은 **초록 여름 공원**.
  '옥포대첩기념공원'   — 등재명 정확. 사진은 **실내 전시실**.

이름으로는 영영 못 잡는다. 그래서 픽셀을 본다.

무엇을 재는가 (HSV 로 바꿔서 픽셀 비율을 센다):
  warm   단풍색 — 붉고 주황인 픽셀
  green  여름색 — 초록 픽셀
  bright 눈·설경 — 밝고 채도 낮은 픽셀
  sky    실외 여부 — 사진 위쪽 1/3 의 하늘색 픽셀

photo-requests.json 의 요청에 expect 를 적어 두면 그것과 대조한다:
  {"slug": "...", "keyword": "단풍", "expect": {"season": "autumn"}}
  {"slug": "...", "keyword": "...",  "expect": {"outdoor": true}}

이건 판사가 아니라 **경보기**다. 애매하면 사람을 부른다.
"""
import json, io, sys, glob, os
from PIL import Image

SAMPLE = 96          # 가로세로 96px 로 줄여서 센다. 색 비율만 필요하다.

def measure(path):
    im = Image.open(path).convert('RGB')
    im.thumbnail((SAMPLE, SAMPLE))
    hsv = im.convert('HSV')
    px = list(hsv.getdata())
    w, h = hsv.size
    n = len(px) or 1
    warm = green = bright = 0
    sky = 0
    top = w * (h // 3) or 1
    for i, (H, S, V) in enumerate(px):
        hue = H * 360 / 255.0
        s, v = S / 255.0, V / 255.0
        if s > 0.28 and v > 0.25 and (hue <= 45 or hue >= 345):
            warm += 1
        if s > 0.22 and 70 <= hue <= 165:
            green += 1
        if v > 0.78 and s < 0.18:
            bright += 1
        if i < top and s > 0.12 and v > 0.5 and 175 <= hue <= 255:
            sky += 1
    return {'warm': warm / n, 'green': green / n, 'bright': bright / n,
            'sky': sky / top}

RULES = {
    # (설명, 검사 함수) — True 면 통과
    'autumn': ('단풍이 들어 있어야 합니다',
               lambda m: m['warm'] >= 0.12 and m['warm'] > m['green']),
    'winter': ('눈 또는 겨울 풍경이어야 합니다',
               lambda m: m['bright'] >= 0.12 or m['green'] < 0.10),
    'spring': ('꽃이 피어 있어야 합니다 (밝은 색 비율)',
               lambda m: m['bright'] >= 0.10 or m['warm'] >= 0.08),
    'summer': ('여름 녹음이어야 합니다', lambda m: m['green'] >= 0.15),
}

def main():
    reqs = json.load(io.open('data/photo-requests.json', encoding='utf-8'))['requests']
    expect = {r['slug']: r.get('expect', {}) for r in reqs if r.get('expect')}
    places = json.load(io.open('data/place-images.json', encoding='utf-8'))['places']

    problems, checked = [], 0
    for pl in places:
        exp = expect.get(pl['slug'])
        if not exp:
            continue
        files = sorted(glob.glob(f"src/assets/images/**/{pl['slug']}-*.jpg", recursive=True))
        if not files:
            continue
        ms = [measure(f) for f in files]
        checked += len(files)
        avg = {k: sum(m[k] for m in ms) / len(ms) for k in ms[0]}

        if 'season' in exp and exp['season'] in RULES:
            why, ok = RULES[exp['season']]
            if not ok(avg):
                problems.append(
                    f"  {pl['slug']} ({pl.get('title','')}) — {exp['season']} 을 기대했으나 {why} 를 만족하지 않습니다\n"
                    f"      단풍색 {avg['warm']:.0%} · 초록 {avg['green']:.0%} · 밝음 {avg['bright']:.0%}")
        if exp.get('outdoor') and avg['sky'] < 0.03 and avg['green'] < 0.10:
            problems.append(
                f"  {pl['slug']} ({pl.get('title','')}) — 실외를 기대했으나 하늘도 초목도 거의 없습니다 (실내 사진일 수 있음)\n"
                f"      하늘 {avg['sky']:.0%} · 초록 {avg['green']:.0%}")

    if problems:
        print(f"사진 내용이 기대와 다릅니다 ({len(problems)}건)\n")
        print('\n'.join(problems))
        print("\n등재명이 맞아도 사진이 맞는다는 뜻은 아닙니다. 열어서 확인하십시오.")
        return 1
    print(f"사진 내용 검사 통과 — {checked}장 확인")
    return 0

if __name__ == '__main__':
    sys.exit(main())

# -*- coding: utf-8 -*-
"""
네이버 데이터랩 도표 생성기.

라벨 겹침을 손으로 맞추지 않는다 (2026-08-14 운영자 지적).
선이 끝나는 높이가 비슷하면 글자가 포개져 읽을 수 없는 단어가 된다.
"Malatang" 과 "Coin karaoke" 가 겹쳐 "Molaitakraoke" 로 보였다.
=> 이상적 위치에서 시작해 최소 간격을 강제로 벌리고, 넘치면 전체를 밀어올린다.
   데이터가 바뀌어도 다시 깨지지 않는다.
"""
MINGAP = 17.0

def spread(items, top, bottom):
    """items: [(key, y_ideal)] -> {key: y_final}. 순서는 y 기준으로 유지된다."""
    it = sorted(items, key=lambda t: t[1])
    ys = [y for _, y in it]
    for i in range(1, len(ys)):                      # 위에서부터 아래로 밀어냄
        if ys[i] - ys[i-1] < MINGAP:
            ys[i] = ys[i-1] + MINGAP
    overflow = ys[-1] - bottom
    if overflow > 0:                                  # 아래로 넘치면 전체를 위로
        ys = [y - overflow for y in ys]
    for i in range(len(ys)-2, -1, -1):                # 위로 넘치지 않게 되밀기
        if ys[i+1] - ys[i] < MINGAP:
            ys[i] = ys[i+1] - MINGAP
    shortfall = top - ys[0]
    if shortfall > 0:
        ys = [y + shortfall for y in ys]
    return {k: y for (k, _), y in zip(it, ys)}

def line_chart(series, colors, xlabels, ymax, ylabels, W=760, H=310,
               L=48, R=126, T=20, B=36, aria="", dot=None, note=None):
    n = len(next(iter(series.values())))
    pw, ph = W-L-R, H-T-B
    x = lambda i: L + pw*i/(n-1)
    y = lambda v: T + ph*(1 - min(v, ymax)/ymax)

    grid = "".join(
        f'<line x1="{L}" y1="{y(v):.1f}" x2="{W-R}" y2="{y(v):.1f}" stroke="#e5ddd3" stroke-width="1"/>'
        f'<text x="{L-8}" y="{y(v)+4:.1f}" text-anchor="end" font-size="11.5" fill="#6b6560">{t}</text>'
        for v, t in ylabels)

    paths = "".join(
        f'<path d="M{" L".join(f"{x(i):.1f},{y(v):.1f}" for i, v in enumerate(d))}" '
        f'fill="none" stroke="{colors[k]}" stroke-width="2.3" stroke-linejoin="round"/>'
        for k, d in series.items())

    pos = spread([(k, y(d[-1])+4) for k, d in series.items()], T+6, H-B-2)
    labels = "".join(
        f'<text x="{W-R+7}" y="{pos[k]:.1f}" font-size="12" font-weight="600" '
        f'fill="{colors[k]}">{k}</text>' for k in series)
    # 라벨을 밀어낸 만큼 선 끝과 멀어지므로 잇는 선을 그린다
    leaders = "".join(
        f'<line x1="{W-R+1}" y1="{y(d[-1]):.1f}" x2="{W-R+5}" y2="{pos[k]-4:.1f}" '
        f'stroke="{colors[k]}" stroke-width="1" opacity="0.55"/>'
        for k, d in series.items() if abs(pos[k]-4 - y(d[-1])) > 3)

    xl = "".join(
        f'<text x="{min(max(x(i), L+20), W-R-20):.1f}" y="{H-12}" text-anchor="middle" '
        f'font-size="11.5" fill="#6b6560">{t}</text>' for i, t in xlabels)

    extra = ""
    if dot:
        k, i, txt, vy = dot
        extra = (f'<circle cx="{x(i):.1f}" cy="{y(series[k][i]):.1f}" r="4.5" fill="{colors[k]}"/>'
                 f'<line x1="{x(i):.1f}" y1="{y(series[k][i])+7:.1f}" x2="{x(i):.1f}" y2="{y(vy)-12:.1f}" '
                 f'stroke="{colors[k]}" stroke-width="1" stroke-dasharray="2 2"/>'
                 f'<text x="{x(i):.1f}" y="{y(vy):.1f}" text-anchor="middle" font-size="12" '
                 f'font-weight="600" fill="{colors[k]}">{txt}</text>')

    return (f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="{aria}">\n{grid}{paths}{leaders}{labels}{extra}{xl}\n</svg>')

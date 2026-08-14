# -*- coding: utf-8 -*-
# 한국소비자원 참가격 외식비, 2026년 6월. 최저~최고 구간과 서울의 위치.
D=[
 ("Samgyeopsal 200g","삼겹살",15305,"Chungbuk",21321,"Seoul",21321),
 ("Samgyetang","삼계탕",15600,"Ulsan",18154,"Seoul",18154),
 ("Naengmyeon","냉면",9667,"Jeonnam",12615,"Seoul",12615),
 ("Bibimbap","비빔밥",9154,"Gyeongnam",12100,"Jeonbuk",11769),
 ("Kalguksu","칼국수",7583,"Daegu",10375,"Jeju",10038),
 ("Kimchi jjigae set","김치찌개백반",8278,"Jeonnam",10800,"Daejeon",8654),
 ("Jajangmyeon","자장면",6769,"Gyeongbuk",7750,"Jeju",7654),
 ("Gimbap (1 roll)","김밥",2889,"Jeonnam",3838,"Seoul",3838),
]
W,H=760,360; L,R,T,B=168,132,26,40
pw,ph=W-L-R,H-T-B
MAX=22000
x=lambda v:L+pw*v/MAX
n=len(D)
step=ph/n
rows=[]
for i,(en,ko,lo,lon,hi,hin,seoul) in enumerate(D):
    y=T+step*(i+0.5)
    seoul_is_max = abs(seoul-hi)<1
    rows.append(
      f'<text x="{L-12}" y="{y+4:.1f}" text-anchor="end" font-size="12.5" fill="#12100f">{en}</text>'
      f'<line x1="{x(lo):.1f}" y1="{y:.1f}" x2="{x(hi):.1f}" y2="{y:.1f}" stroke="#d8cfc4" stroke-width="6" stroke-linecap="round"/>'
      f'<circle cx="{x(lo):.1f}" cy="{y:.1f}" r="5" fill="#1f7a4d"/>'
      f'<circle cx="{x(hi):.1f}" cy="{y:.1f}" r="5" fill="{"#c8341f" if seoul_is_max else "#6b6560"}"/>'
      + ('' if seoul_is_max else f'<circle cx="{x(seoul):.1f}" cy="{y:.1f}" r="5.5" fill="#c8341f"/>')
      + f'<text x="{x(hi)+11:.1f}" y="{y+4:.1f}" font-size="11.5" fill="#6b6560">{hi:,}</text>'
      f'<text x="{x(lo)-11:.1f}" y="{y+4:.1f}" text-anchor="end" font-size="11.5" fill="#1f7a4d">{lo:,}</text>')
ticks="".join(f'<line x1="{x(v):.1f}" y1="{T-4}" x2="{x(v):.1f}" y2="{H-B}" stroke="#efe9e1"/>'
               f'<text x="{x(v):.1f}" y="{H-B+16}" text-anchor="middle" font-size="11" fill="#6b6560">{v//1000}k</text>'
               for v in (0,5000,10000,15000,20000))
legend=(f'<circle cx="{L}" cy="{H-10}" r="5" fill="#1f7a4d"/><text x="{L+10}" y="{H-6}" font-size="11.5" fill="#6b6560">cheapest region</text>'
        f'<circle cx="{L+150}" cy="{H-10}" r="5" fill="#c8341f"/><text x="{L+160}" y="{H-6}" font-size="11.5" fill="#6b6560">Seoul</text>'
        f'<circle cx="{L+230}" cy="{H-10}" r="5" fill="#6b6560"/><text x="{L+240}" y="{H-6}" font-size="11.5" fill="#6b6560">dearest region (grey = not Seoul)</text>')
svg=(f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" '
     f'aria-label="Price range across Korean regions for eight standard restaurant dishes, June 2026. Seoul is the most expensive region for samgyeopsal, samgyetang, naengmyeon and gimbap, but not for bibimbap, kalguksu, kimchi jjigae or jajangmyeon.">'
     f'{ticks}{"".join(rows)}{legend}</svg>')
open('/tmp/ch/price.svg','w',encoding='utf-8').write(svg)
print('도표 생성')
for en,ko,lo,lon,hi,hin,s in D:
    print(f'  {en:20} {lo:>6,} ({lon}) ~ {hi:>6,} ({hin})   Seoul {s:>6,}   격차 {(hi/lo-1)*100:>4.0f}%')

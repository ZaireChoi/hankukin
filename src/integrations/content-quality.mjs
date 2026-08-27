/**
 * 발행 전 자체 점검 — 운영자가 지적하기 전에 빌드가 먼저 잡는다.
 *
 * 왜 만들었나 (2026-08-14).
 *
 *   운영자가 하루 동안 지적한 것들 — 같은 사진 돌려쓰기, 도표 글자 겹침,
 *   정적인 사진만 있다는 것 — 은 **전부 이미 _주제은행.md 에 적혀 있던 규칙**이었다.
 *   규칙을 몰라서 어긴 것이 아니라, 적어 두고 확인하지 않아서 어겼다.
 *
 *   그러므로 규칙을 하나 더 적는 것은 해결이 아니다.
 *   기계가 볼 수 있는 것은 기계가 보게 하고,
 *   사람만 볼 수 있는 것(사진이 이 기사에 어울리는가)에 사람의 눈을 남긴다.
 *
 * 여기서 막는 것 — 확인만 하면 알 수 있는데 놓쳤던 것들.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { ALLOWED_LABELS } from '../config/products.mjs';
import { MERCHANTS, isAffiliate } from '../config/merchants.mjs';

/** 제휴 상점의 host 목록 — 게이트가 상점 이름을 하드코딩하지 않도록 한 곳에서 읽는다. */
const MERCHANT_HOSTS = Object.values(MERCHANTS).map((m) => m.host).filter(Boolean);
import { UI, flatKeys } from '../config/ui.mjs';
import { LOCALES, DEFAULT_LOCALE } from '../config/brand.mjs';

const CONTENT_DIR = 'src/content';

/**
 * 대표사진이 없어도 되는 기사와 그 이유.
 *
 * "모든 글에 사진이 있어야 한다" 는 원칙이지만, 없는 사진을 지어낼 수는 없다.
 * 다만 예외는 **이유를 적어야** 통과한다. 이유를 적기 귀찮으면 사진을 넣게 된다.
 * 사진이 도착하면 이 줄을 지우는 것이 할 일 목록이 된다.
 */
const HERO_EXEMPT = {
  // 2026-08-20 해제. 이태원 편은 이제 대표사진이 있다.
  //
  // 여기 적혀 있던 면제 사유는 **사실이 틀렸다.** 「이태원 사진 5장이 모두
  // 옷가게 실내였다 · 두 번 확인했다」고 썼는데, itaewon-4 는 실외 거리 사진이고
  // 「이태원시장 / ITAEWON MARKET」 간판이 화면 한가운데에 있다. 그것이 대표사진이 됐다.
  //
  // 「두 번 확인했다」는 문장이 가장 나쁘다. 확인 횟수를 적으면 신뢰가 생기는데,
  // 정작 다섯 장 중 넷째 장을 두 번 다 안 열었다. 면제 사유에 확신을 적기 전에
  // 대상을 하나도 빠짐없이 열었는지부터 볼 것. 면제는 게이트를 끄는 일이다.

  'korea-drinking-age-id-check':
    '주인공이 법조문과 신분증이다. 주민등록증을 찍어 걸면 실존 인물의 성명·주민번호를 발행하는 일이고, ' +
    '술집 문 앞이나 편의점 계산대 사진은 식별 가능한 사람 문제에 바로 걸린다 — 둘 다 금지 항목이다. ' +
    '재고 242장에도 맞는 사진이 없다 (2026-08-20 미사용분 감사에서 쓸 수 있던 세트는 궁·박물관 계열뿐). ' +
    '요점 자체가 「생일이 아니라 1월 1일에 문이 열린다」는 날짜 규칙이라 눈금이 있어야 보인다 — ' +
    '숫자편·문패편과 같은 판단으로 ChartBirthYearGate 를 그렸다. ' +
    '하루 차이로 태어난 두 사람의 문이 일 년 차이로 열리는 그 간격은 사진으로는 찍을 수 없다.',

  'olive-young-myeongdong-which-store':
    '이건 「아직 못 구했다」가 아니라 **가질 수 없는 사진**이다. 이 기사의 주인공은 매장 진열과 ' +
    '틴트 제품이고, 둘 다 남의 저작물이다 — 스키마의 라이선스 목록(kogl-1·kogl-3·cc0·cc-by·cc-by-sa·own)에 ' +
    '들어올 길이 없다. 위키미디어 공용의 화장품 사진도 상표·포장이 그대로 찍혀 있어 CC0 라도 이 용도로는 못 쓴다. ' +
    '요점 자체가 **역에서 몇 미터인가와 세금이 어디서 돌아오는가**라서 사진으로는 애초에 안 보이기도 한다 — ' +
    '눈금이 있어야 보인다. 그래서 ChartMyeongdongOliveYoung 을 그렸다. 가을편·찜질방편과 같은 판단. ' +
    '\n\n' +
    '※ 2026-08-23 정정. 처음에는 「관광공사 TourAPI 에 명동 상점 사진이 한 장도 없다」고 적었는데 ' +
    '**재고를 열어 보지 않고 쓴 문장이었다.** 실제로는 명동 사진이 다섯 장 있다. ' +
    '   myeongdong-1 역주행편 · -3 안경편 · -4 병원편 · -5 음식값편 — 넷은 이미 쓰였고 중복 금지 게이트가 막는다. ' +
    '   남은 myeongdong-2 를 열어 봤더니 **명동성당 광장**이다. 「어느 올리브영으로 갈 것인가」에 성당을 붙이면 ' +
    '   그건 「그냥 서울 사진」이고, 주제와 무관한 장식이다. ' +
    '   결론은 같지만 근거가 달랐다 — 이태원 편에서 배운 것을 또 놓쳤다. ' +
    '   **면제 사유에 확신을 적기 전에 재고를 눈으로 연다.** 이번에는 열고 나서 고쳤다. ' +
    '\n\n' +
    '우리가 직접 찍은(own) 매장 외관 사진이 생기면 그때 검토하고 이 줄을 지운다.',

  'kpop-concert-venues-seoul-which-room':
    '재고를 눈으로 열고 쓴다 (이태원 편에서 배운 것). 우리 라이브러리의 서울 공연장 계열 사진은 ' +
    'olympic-park 6장뿐이고, 열어 보면 **눈 덮인 피크닉장 · 벤치 · 잎 없는 나무**다. 여섯 프레임 어디에도 ' +
    '경기장이 없다. 그리고 그 여섯 장은 이미 다른 기사 세 편에 쓰여 중복 금지 게이트가 막는다. ' +
    'K팝 티켓 편(2026-08-16)에서 같은 이유로 같은 판단을 내렸고, 그 판단을 기사 본문에도 적어 두었다. ' +
    '\n\n' +
    '이 기사에서 사진이 할 일은 「어느 건물로 걸어갈 것인가」인데, 공원 벤치 사진은 그 일을 못 한다. ' +
    '주제와 무관한 「그냥 한국」 사진이 되고, 그건 우리가 안 하기로 한 것이다. ' +
    '대신 ChartConcertRooms 로 여덟 방의 좌석 수를 눈금 위에 올렸다 — 237 대 16,601 은 ' +
    '표로 적으면 숫자 나열이고 눈금 위에 올려야 63배로 보인다. 가을편·명동편과 같은 판단이다. ' +
    '\n\n' +
    '※ TourAPI 등재 사진으로는 이 구멍이 안 메워질 가능성이 크다. 공연장 내부는 대관 사업자의 ' +
    '저작물이고 관객이 찍히며, 등재 사진은 시설 소개용이라 공연 중을 찍지 않는다. ' +
    '우리가 직접 찍은(own) 외관 사진이 생기면 그때 이 줄을 지운다.',

  'korean-shop-door-signs-closed-open':
    '문 앞 안내판 사진이 재고에 0장이다 (2026-08-20 미사용분 감사에서 쓸 수 있던 4세트는 전부 궁·박물관 계열). ' +
    '그리고 있어도 문제다 — 실제 업소의 「금일 휴무」 문을 찍어 걸면 그 가게를 «닫는 가게»로 지목하는 일이 되고, ' +
    '유리문 안의 직원·손님이 찍힌다. 클리닉 간판편(ChartClinicSignFormula)과 같은 판단으로 ' +
    'ChartDoorSigns 를 그렸다 — 전형 문구와 예시 시각으로, 특정 업소를 가리키지 않는다. ' +
    '우리가 직접 찍은(own) 팻말 사진이 생기면 이 줄을 지운다.',

  'konglish-korean-words-that-look-english':
    '사전 항목을 읽는 글이다. 갈 곳도, 볼 것도, 찍을 것도 없다 — 주인공이 낱말의 **뜻풀이**라서 ' +
    '사진으로 보일 대상 자체가 존재하지 않는다. 「서비스로 나온 접시」나 「셀프 코너」 사진을 붙이면 ' +
    '그건 주제와 무관한 「그냥 한국」 사진이고, 우리가 안 하기로 한 바로 그 짓이다. ' +
    '(상점 안 사진은 식별 가능한 사람 문제도 함께 걸린다.) ' +
    '도표로도 지탱하지 않았다 — 본문의 표 두 개(도움 낱말 6개 · 사전 검색 건수 5줄)가 ' +
    '도표가 할 일을 이미 하고 있고, 같은 말을 도표로 한 번 더 하면 가을편에서 지적된 중복이 된다. ' +
    '사진이 생겨서 이 줄을 지울 일은 앞으로도 없을 가능성이 크다.',

  'korean-address-road-name-building-number':
    '도로명판·건물번호판 사진이 재고 242장에 없다. 로마자편에서 후보 다섯 묶음을 ' +
    '대조표로 이미 열어 봤고 (부산역→하운드호텔, 이태원→시장 옷가게, 명동·청계광장→거리 풍경), ' +
    '주소 표지판이 판독 가능하게 찍힌 것은 한 장도 없었다. ' +
    '그리고 이 기사가 가르치는 것은 **번호와 거리의 관계**라서 판 하나를 크게 찍어도 안 보인다 — ' +
    '보이려면 눈금자가 있어야 한다. 로마자편·방(房)편·병원 간판편과 같은 판단. ' +
    '도로명판이 판독 가능하게 찍힌 무인물 거리 사진이 생기면 그때 검토하고 이 줄을 지운다.',

  // 2026-08-22 해제. 위키미디어 공용에서 CC0 사진 7장을 받아 붙였다.
  //   한국관광공사 TourAPI 에는 목욕·찜질이 한 장도 없었다 — 민간 업소라 등재되지 않는다.
  //   그래서 scripts/fetch-commons-images.mjs 로 길을 새로 냈다.
  //   ※ 첫 실행에서 **미국 사진 3장이 통과했다** (아칸소 핫스프링스). expectWords 에
  //     영어 'bathhouse' 를 넣은 것이 원인. 사람이 열어 보고 지웠고 필터를 좁혔다.
  //     받은 7장을 **한 장도 빠짐없이 열어 봤다.** 이번에는 세었다.

  'korean-films-english-subtitles-seoul-kofa':
    '상암·DMC·한국영상자료원 사진이 재고에 242장 중 한 장도 없다 (슬러그 목록을 전부 확인했다). ' +
    '그리고 이 경우는 「아직 못 구했다」에 그치지 않는다 — **상영관 안은 촬영이 금지돼 있고, ' +
    '그 규칙이 이 기사 본문에 인용돼 있다.** 우리가 정당하게 가질 수 있는 사진이 아니다. ' +
    '건물 외관 사진을 붙이면 「그냥 사무용 건물」이 되고, 다른 서울 사진을 붙이면 ' +
    '주제와 무관한 「그냥 한국」 사진이 된다 — 병원 간판편·방(房)편과 같은 판단. ' +
    '게다가 이 기사의 요점은 **영화의 국적과 E 표시가 곱해져서 화면에 무엇이 뜨는가**이고, ' +
    '그건 사진으로는 전달되지 않는다. 2×2 격자(ChartSubtitleGrid)가 사진보다 정확하다. ' +
    'DMC 단지나 자료원 외관이 크게 찍힌 무인물 사진이 생기면 그때 채우고 이 줄을 지운다.',

  'music-show-audience-korea-what-the-rules-say':
    '방송국 공개홀 사진이 재고에 없다. 그리고 이 경우는 「아직 못 구했다」가 아니다 — ' +
    '**스튜디오 안은 촬영이 금지돼 있고, 그 규칙이 이 기사 본문에 인용돼 있다.** ' +
    '우리가 정당하게 가질 수 있는 사진이 아니다. 방송국 건물 외관을 붙이면 ' +
    '주제와 무관한 「그냥 건물」 사진이 된다. ' +
    '게다가 이 기사의 요점은 **두 방송사의 안내 페이지가 각각 무엇으로 만들어져 있는가** ' +
    '(한쪽은 글, 한쪽은 그림 한 장)이고, 그건 대조 도표로만 보인다. ' +
    'SBS 화면을 캡처해 싣는 것도 검토했으나 남의 저작물이라 하지 않는다.',

  'n-seoul-tower-ticket-price-hours':
    '남산 사진 재고 5장은 전부 공원 산책로이고, 그중 2장은 이미 KPop Demon Hunters 편이 쓰고 있다 ' +
    '(사진 공유 금지 게이트). 남은 것을 붙이면 타워가 안 보이는 「그냥 남산」 사진이 되고, ' +
    '이 기사의 요점은 **높이의 어느 지점에 서느냐**라서 사진으로는 전달되지 않는다. ' +
    '506.7m(첨탑 끝)와 400m(전망대)를 한 막대 위에 찍는 도해가 사진보다 낫다 — ' +
    '기후동행카드 편과 같은 판단. 타워가 크게 찍힌 미사용 사진이 생기면 그때 채운다.',

  'seoul-to-busan-ktx-srt-integration-2026':
    '부산·수서역·서울역 사진이 한 장도 없다. 서울역으로 받았던 6장은 실제로 ' +
    '서울역사박물관이었다 (간판이 사진에 찍혀 있다). 다른 도시 사진으로 대신하면 ' +
    '거짓이 된다. data/photo-requests.json 에 부산역·해운대·감천문화마을이 ' +
    '올라가 있으므로 수집되면 채우고 이 줄을 지운다.',

  'korean-clinic-pharmacy-signs':
    '의료기관 간판 사진이 재고에 없고, 있어도 문제다 — 의료기관 앞·안의 ' +
    '식별 가능한 사람은 쓰지 않기로 했다 (그 사람은 아파서 거기 있었다). ' +
    '거리 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 된다. ' +
    '이 기사가 가르치는 것은 간판 문자열의 구조라서 해부도가 사진보다 낫다 — ' +
    'eSIM 편과 같은 판단. 의료기관 간판이 크게 찍힌 무인물 사진이 생기면 그때 채운다.',

  'korean-bang-suffix-noraebang-jjimjilbang':
    '노래방·찜질방·빨래방 간판 사진이 재고에 없다. 미사용분인 이태원 5장을 ' +
    '전부 열어 봤지만 등재명이 「이태원시장」 인 옷가게 실내였다 — 이 주제의 사진이 아니고, ' +
    '거리 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 된다. ' +
    '이 기사가 가르치는 것은 낱말의 조립 방식이라 등식 도해가 사진보다 낫다 — ' +
    '병원 간판편과 같은 판단. 방(房) 간판이 크게 찍힌 무인물 거리 사진이 생기면 그때 채운다.',

  'seoul-line-9-express-geuphaeng-ilban':
    '지하철 사진이 한 장도 없다 — 재고 332장의 **슬러그를 전부 나열해서** 확인했다 ' +
    '(승강장·열차·전광판·역사 어느 것도 없다. 서울역으로 받았던 6장은 서울역사박물관이었고 ' +
    '부산역 6장은 하운드호텔이다). ' +
    '한 장이 아깝게 걸렸다 — **올림픽공원**은 9호선 급행정차역 16개 중 하나이고 사진이 6장 있다. ' +
    '그런데 그 6장은 **설경**이고, 「눈은 언제 오나」 편이 이미 쓰고 있다(사진 공유 금지 게이트). ' +
    '설사 남아 있었대도 눈 덮인 공원 사진은 이 기사의 요점 — **같은 선로에 두 종류의 열차가 온다** — 을 ' +
    '한 획도 보이지 않는다. 그건 주제와 무관한 「그냥 한국」 사진이다. ' +
    '요점 자체가 사진에 안 찍힌다: 대피역에서 벌어지는 일은 **멈춰 선 열차와 지나가는 열차의 관계**이고, ' +
    '한 장으로는 「문 열린 채 서 있는 열차」밖에 안 나온다 — 그건 고장 난 열차와 구별이 안 된다. ' +
    '병원 간판편·방(房)편·로마자편과 같은 판단이며, 본문의 표(급행/일반 두 줄)와 급행정차역 16개 나열이 ' +
    '도표가 할 일을 이미 하고 있어 도표도 넣지 않았다. ' +
    '승강장 행선안내기에 급행·일반이 판독 가능하게 찍힌 무인물 사진이 생기면 그때 채우고 이 줄을 지운다.',

  'korean-romanization-jongno-not-jongro':
    '로마자 표기가 찍힌 간판 사진이 재고에 없다. 후보 다섯 묶음을 대조표로 열어 봤다 — ' +
    '부산역 6장은 등재명이 **하운드호텔 부산역점**이고(역이 아니다), 이태원 5장은 이태원시장 ' +
    '옷가게, 명동·청계광장은 거리 풍경이다. 유일하게 주제에 닿는 것이 인사동-5 의 벽면 간판인데 ' +
    '**그 간판에는 로마자가 아예 없고**(한글 「전통문화의 거리 인사동」뿐), 게다가 한글 1편이 ' +
    '이미 대표사진으로 쓰고 있다 (사진 공유 금지 게이트). ' +
    '그리고 이 기사가 보이려는 것은 결과가 아니라 **중간 단계**다 — 글자에서 소리로 갔다가 ' +
    '로마자로 오는 그 한 칸. 간판 사진은 마지막 칸만 보여주므로 요점을 못 보인다. ' +
    '2행 대조도가 사진보다 정확하다 — 방(房)편·병원 간판편과 같은 판단. ' +
    '로마자 병기가 크게 찍힌 무인물 간판 사진이 생기면 그때 검토한다.',

  'lost-something-in-korea-what-to-do':
    '분실물센터·역무실 사진이 재고에 없다. 그리고 이 기사가 전달하는 것은 **시계**다 — ' +
    '7일이 지나면 물건이 지하철에서 경찰서로 옮겨 가고, 찾아갈 건물이 바뀐다. ' +
    '역 사진을 붙이면 그 사실이 아니라 분위기가 전달된다. 표 두 개(처리 흐름·센터 위치)가 ' +
    '사진보다 정확히 그 일을 한다. 지하철 유실물센터 내부의 무인물 공개사진이 생기면 그때 채운다.',

  'english-pages-korea-out-of-date':
    '이 기사의 증거는 **화면에 적힌 문장**이다 — 서울관광재단 영어 페이지의 ' +
    '「The basic subway fare is 1,250 KRW」. 그런데 그 화면을 캡처해서 실으면 ' +
    '남의 저작물을 통째로 옮기는 것이 되고, 공공누리 제4유형(변경금지·상업적 이용금지) ' +
    '문제도 걸린다. 인용은 문장으로 하고 링크로 보낸다 — 독자가 직접 열어 보는 편이 ' +
    '캡처보다 강하다. 그 페이지가 고쳐지면 우리 인용이 근거를 잃는데, ' +
    '**그건 좋은 일이므로** 캡처로 붙잡아 두지 않는다.',

  'seoul-climate-card-ending-what-visitors-should-buy':
    '기후동행카드 실물 카드·역사 발매기 사진이 재고에 없다. 그리고 이 기사가 ' +
    '전달하는 것은 **날짜**다 — 8/31 충전 마감, 9/29 최종 이용, 10/1 종료. ' +
    '카드 사진을 붙이면 「이 카드를 사라」로 읽히는데, 이 기사의 결론은 그 반대다. ' +
    '표 두 개(일정·단기권 가격)가 사진보다 정확히 그 일을 한다 — eSIM 편과 같은 판단. ' +
    '다만 이건 사진이 없어도 되는 기사가 아니라 **없는 기사**다. 서울 지하철 역사의 ' +
    '교통카드 발매기 무인물 사진이 생기면 그때 채운다.',

  'korea-3d-secure-card-declined-online':
    '결제 실패 화면은 남의 결제 정보라 찍을 수 없고, 찍어도 특정 카드사·특정 가맹점의 ' +
    '한 사례일 뿐이라 오히려 오해를 만든다. 이 기사의 값은 증상으로 벽을 구분하는 ' +
    '진단이라 도해가 사진보다 낫다 — eSIM 편과 같은 판단. 이 기사에는 앞으로도 채우지 않는다.',

  'kpop-concert-tickets-korea-foreigners':
    '서울 공연장 사진이 재고에 없다. 미사용분인 올림픽공원 2·6번을 대조표로 열어 봤으나 ' +
    '6장 전부 **올림픽공원피크닉장** (등재명도 그렇다) — 눈 덮인 잔디와 벤치, 앙상한 나무이고 ' +
    'KSPO돔은 어느 프레임에도 없다. 겨울편이 이미 같은 묶음에서 4장을 쓰고 있다. ' +
    '공원 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 되고, 그건 우리가 안 쓰기로 한 것이다. ' +
    '이 기사가 말하는 것은 **자격 심사의 순서**라 일정 도표가 사진보다 낫다 — ' +
    'eSIM 편·3D Secure 편과 같은 판단. KSPO돔·잠실실내체육관이 크게 찍힌 사진이 생기면 그때 채운다.',

  'korea-atm-foreign-card-cash':
    'ATM 화면·카드 슬롯 사진은 재고에 없고, 있어도 **한 대의 기계는 답이 아니다.** ' +
    '이 기사의 요지는 특정 은행이 아니라 「기계에 찍힌 네트워크 마크를 보라」는 판별법이라, ' +
    '어느 은행 ATM 한 대를 크게 찍어 놓으면 오히려 그 은행이 답이라는 오해를 만든다. ' +
    '그리고 ATM 앞의 식별 가능한 사람은 찍지 않기로 했다 — 그 사람은 돈을 뽑는 중이었다. ' +
    '3D Secure 편·eSIM 편과 같은 판단. 이 기사에는 앞으로도 채우지 않는다.',

  'korea-esim-no-phone-number':
    'eSIM 은 **사진으로 찍을 수 있는 물건이 아니다.** 실물이 없다. ' +
    '상품 페이지의 사진은 QR 코드 그림이고 그건 아무것도 설명하지 않는다. ' +
    '거리 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 되고, 그건 우리가 안 쓰기로 한 것이다. ' +
    '이 기사가 말하려는 것은 **경계선**이라 도표가 사진보다 낫다 — ' +
    '데이터로 되는 일과 한국 번호가 있어야 되는 일 사이의 선. ' +
    '가을편이 단풍 사진 없이 산림청 도표로 지탱한 것과 같은 판단이다. ' +
    '사진이 생기면 채우는 것이 아니라, 이 기사에는 앞으로도 채우지 않는다.',

  'banmal-jondaemal-when-casual-korean-is-rude':
    '말투에는 실물이 없다. 미사용 재고 139장을 훑었으나 궁궐·역·거리뿐이고, ' +
    '어느 것을 붙여도 주제와 무관한 「그냥 한국」 사진이 된다 — 우리가 안 쓰기로 한 것이다. ' +
    '사람이 대화하는 사진은 더 나쁘다. **식별 가능한 사람에게 「이쪽이 반말을 듣는 쪽」이라는 ' +
    '설명을 붙이는 셈**이 되고, 그건 병원 간판편에서 안 하기로 한 것과 같은 종류의 일이다. ' +
    '이 기사의 요점은 **여섯 칸 중 둘이 비어 있다**는 것이라 사다리 도표가 사진보다 정확하다 — ' +
    '방(房)편·eSIM 편과 같은 판단. 이 기사에는 앞으로도 채우지 않는다.',

  'korean-numbers-two-counting-systems':
    '숫자에는 실물이 없다. 가격표·영수증을 찍은 사진이면 주제에 닿겠지만 재고에 한 장도 없고, ' +
    '남의 영수증에는 상호·시각·카드 뒷자리가 함께 찍힌다 — ATM 편·3D Secure 편에서 ' +
    '안 찍기로 한 것과 같은 종류다. 거리 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 된다. ' +
    '그리고 이 기사의 요점은 **같은 자릿수 위에서 쉼표와 만이 어긋나는 그 한 칸**이라 ' +
    '사진으로는 애초에 보이지 않는다. 제44항에 실린 예(12억 3456만 7898) 위에 ' +
    '세 자리 눈금과 네 자리 눈금을 겹쳐 그린 도해가 사진보다 정확하다 — ' +
    '로마자편·방(房)편과 같은 판단. 이 기사에는 앞으로도 채우지 않는다.',

  // 2026-08-14 저녁: 창덕궁 인정문 사진이 도착해 예외를 해제했다.
  //   TourAPI 에 '창덕궁' 본궁은 없지만 '창덕궁 인정문' 은 있었고,
  //   요청서에 exactTitle 로 등재명을 직접 지정하니 6장이 들어왔다.
  //   목록이 비어 있는 것이 정상 상태다. 예외를 추가할 때는 반드시 사유를 적을 것.
};

const TITLE_MAX = 62;   // 검색 결과에서 잘리는 대략의 길이
const IMG_SUBJ = /assets\/images\/[\w/-]+\/([\w.-]+)\.(?:jpg|jpeg|png|webp|avif)/gi;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (['.md', '.mdx'].includes(extname(p))) out.push(p);
  }
  return out;
}

export default function contentQuality() {
  return {
    name: 'hankukin:content-quality',
    hooks: {
  
    /*
     * ── 열세 번째 게이트: 화면에 마크다운 기호가 그대로 나온 곳 ──────────
     *
     * 2026-08-16. 운영자가 배포된 일본어 기사를 읽다가 찾았다.
     * 본문 한가운데에 `**` 가 글자 그대로 찍혀 있었다.
     *
     * 원인이 둘이었고, 둘 다 **소스만 봐서는 안 보인다.**
     *   ① ui.mjs 같은 평문 문자열에 마크다운을 썼다.
     *      그 문자열은 그냥 텍스트로 출력되므로 `**` 는 영원히 `**` 다.
     *   ② MDX 에서 CJK 문장에 `**` 를 썼다.
     *      CommonMark 는 여는 `**` 뒤가 구두점이면 앞이 공백/구두점일 때만
     *      강조로 인정한다. 「として**「…」**と」 처럼 일본어·중국어에서는
     *      이 조건이 자주 깨진다. **영어에서는 거의 안 깨진다** —
     *      그래서 영어만 보고 있으면 평생 모른다. 실제로 영어 페이지는 0건이었다.
     *
     * 소스는 맞고 출력이 틀린 부류라서, 빌드가 끝난 뒤 dist 를 읽어야 잡힌다.
     * 이 사이트에서 제일 비쌌던 버그 두 개가 전부 이 부류였다.
     */
    'astro:build:done': async ({ dir, logger }) => {
      const { readdirSync, readFileSync, statSync } = await import('node:fs');
      const { join } = await import('node:path');
      const root = dir.pathname.replace(/^\/([A-Za-z]:)/, '$1');

      const pages = [];
      const walk = (d) => {
        for (const e of readdirSync(d)) {
          const f = join(d, e);
          if (statSync(f).isDirectory()) walk(f);
          else if (e.endsWith('.html')) pages.push(f);
        }
      };
      try { walk(root); } catch { return; }

      const bad = [];
      for (const f of pages) {
        const html = readFileSync(f, 'utf8')
          .replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
        const text = html.replace(/<[^>]+>/g, ' ');
        const n = (text.match(/\*\*/g) ?? []).length;
        if (n) {
          const m = /(.{0,28})\*\*(.{0,28})/s.exec(text);
          bad.push(`${f.slice(root.length).replace(/\\/g, '/')} — ${n}곳\n` +
                   `        …${(m?.[1] ?? '').trim()}**${(m?.[2] ?? '').trim()}…`);
        }
      }

      if (bad.length) {
        logger.error(
          '\n\n화면에 마크다운 기호(**)가 그대로 나옵니다.\n\n  ' +
          bad.join('\n  ') +
          '\n\n원인은 보통 둘 중 하나입니다.\n' +
          '  ① 평문 문자열(ui.mjs·policy.mjs 등)에 마크다운을 썼다 — 거기서는 강조가 되지 않습니다.\n' +
          '  ② CJK 문장에서 `**` 앞뒤가 모두 구두점이다 — CommonMark 가 강조로 인정하지 않습니다.\n' +
          '     그 경우 <strong>…</strong> 을 쓰십시오.\n\n' +
          '**영어 페이지에서는 거의 재현되지 않습니다.** 영어만 보고 있으면 모릅니다.\n',
        );
        throw new Error('화면에 마크다운 기호가 노출됐습니다 — 위 목록을 고치십시오.');
      }
      /*
       * ── 열네 번째 게이트: 번역 페이지에 남은 영어 화면문구 ──────────────
       *
       * 2026-08-17. 열한 번째 게이트는 「ui.mjs 에 번역이 **빠졌는가**」를 본다.
       * 오늘 걸린 것은 그 반대였다. **번역은 처음부터 다 있었다.**
       * Original.astro 가 `lang = 'en'` 을 기본값으로 두었고,
       * 그 컴포넌트를 부르는 MDX 34곳 중 lang 을 넘긴 곳이 0곳이었다.
       * 그래서 일본어·중국어 기사 10편의 인용 블록마다
       * "The Korean sentence this comes from" 이 영어로 찍혀 나갔다.
       *
       * 원본(ui.mjs)을 봐도, 컴포넌트를 봐도, 기사를 봐도 잘못된 곳이 없다.
       * **출력에서만 보인다.** 그래서 여기서 본다.
       *
       * 판정: /ja/, /zh-hans/ … 페이지의 보이는 글자 안에
       *       그 언어에서 다르게 번역돼 있는 영어 원문이 통째로 들어 있으면 세운다.
       * 12자 미만은 보지 않는다 — 'Stuck?' 같은 짧은 말은 본문에 우연히 섞인다.
       */
      const flatten = (obj, prefix = '', out = {}) => {
        for (const [k, v] of Object.entries(obj ?? {})) {
          const key = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
          else out[key] = v;
        }
        return out;
      };
      const enFlat = flatten(UI[DEFAULT_LOCALE]);
      const leaks = [];
      for (const lang of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
        const other = flatten(UI[lang]);
        const suspects = Object.entries(enFlat)
          .filter(([k, v]) => typeof v === 'string' && v.length >= 12 && other[k] !== v);
        for (const f of pages) {
          /*
           * root 는 끝에 '/' 가 붙어 온다 (dir.pathname). 그래서 slice 결과는
           * '/ja/…' 가 아니라 'ja/…' 다. 2026-08-17 이 게이트를 처음 쓸 때
           * `/${lang}/` 로 비교했고, **버그를 일부러 되살려도 게이트가 안 울었다.**
           * 안 우는 게이트는 없는 게이트보다 나쁘다 — 통과했다고 말하기 때문이다.
           */
          const rel = '/' + f.slice(root.length).replace(/\\/g, '/').replace(/^\//, '');
          if (!rel.startsWith(`/${lang}/`)) continue;
          const text = readFileSync(f, 'utf8')
            .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
            .replace(/<[^>]+>/g, ' ');
          for (const [k, v] of suspects) {
            if (text.includes(v)) leaks.push(`${rel} — ui.${k}\n        영어 그대로: "${v}"\n        있어야 할 말: "${other[k]}"`);
          }
        }
      }
      if (leaks.length) {
        logger.error(
          '\n\n번역 페이지에 영어 화면문구가 그대로 나갔습니다.\n\n  ' +
          leaks.slice(0, 12).join('\n  ') +
          (leaks.length > 12 ? `\n  … 외 ${leaks.length - 12}곳` : '') +
          '\n\nui.mjs 에는 번역이 **있습니다.** 화면까지 전달되지 않은 것입니다.\n' +
          'MDX 안에서 쓰는 컴포넌트라면 lang 을 prop 으로 받지 말고\n' +
          'Astro.url.pathname 에서 읽으십시오 — 필자는 언젠가 반드시 잊습니다.\n',
        );
        throw new Error('번역 페이지에 영어 화면문구가 남았습니다 — 위 목록을 고치십시오.');
      }

      /*
       * ── 열네 번째 게이트 (b): 번역 페이지의 meta description ──────────────
       *
       * 2026-08-23. 위 게이트가 **왜 못 잡았는지**부터 적는다.
       *   `.replace(/<[^>]+>/g, ' ')` 로 태그를 통째로 지운다.
       *   그러면 <meta name="description" content="…"> 도 공백이 된다 —
       *   **검사 대상에 애초에 들어온 적이 없다.**
       *
       * 그래서 일본어·중국어 Scenes 색인이 영어 설명을 달고 나가는 동안
       * 「번역면에 남은 영어 화면문구 없음」이 계속 초록이었다.
       * 색인 다섯 중 Scenes 만 하드코딩돼 있었고, 아무도 몰랐다.
       *
       * meta description 은 **화면에 안 보이는 자리**다. 그래서 사람이 못 잡는다.
       * 검색 결과에만 나오므로, 틀려 있으면 정확히 우리가 팔려는 자리에서만 틀린다.
       *
       * 판정은 아주 단순하게 한다 — **CJK 글자가 하나도 없으면 영어다.**
       * 일본어·중국어 설명문에 가나·한자·한글이 한 글자도 없는 경우는 없다.
       * 정교한 언어 판별을 넣지 않는 이유: 안 터지는 게이트가 되기 쉽다.
       */
      /*
       * 범위를 글자로 적지 않고 \u 이스케이프로 적는다.
       * 이 파일이 한 번이라도 다른 인코딩으로 저장되면 글자로 적은 범위는 깨지는데,
       * 깨진 정규식은 오류를 내지 않고 **그냥 아무것도 안 잡는다.**
       * 안 우는 게이트는 없는 게이트보다 나쁘다 — 통과했다고 말하기 때문이다.
       *   3040–30FF 가나 · 3400–4DBF 한자확장A · 4E00–9FFF 한자 · AC00–D7AF 한글
       */
      const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯]/;
      const latinMeta = [];
      for (const f of pages) {
        const rel = '/' + f.slice(root.length).replace(/\\/g, '/').replace(/^\//, '');
        const lang = LOCALES.filter((l) => l !== DEFAULT_LOCALE).find((l) => rel.startsWith(`/${l}/`));
        if (!lang) continue;
        const html = readFileSync(f, 'utf8');
        for (const [what, re] of [
          ['description', /<meta name="description" content="([^"]*)"/],
          ['og:description', /<meta property="og:description" content="([^"]*)"/],
        ]) {
          const v = re.exec(html)?.[1];
          if (v && v.length >= 12 && !CJK.test(v)) {
            latinMeta.push(`${rel} — ${what}\n        "${v.slice(0, 90)}${v.length > 90 ? '…' : ''}"`);
          }
        }
      }
      if (latinMeta.length) {
        logger.error(
          '\n\n번역 페이지의 meta description 이 영어입니다.\n\n  ' +
          latinMeta.slice(0, 12).join('\n  ') +
          (latinMeta.length > 12 ? `\n  … 외 ${latinMeta.length - 12}곳` : '') +
          '\n\n**화면에는 안 보이는 자리라 눈으로는 못 찾습니다.** 검색 결과에만 나옵니다.\n' +
          '원인은 대개 페이지 파일에 설명을 직접 적은 것입니다.\n' +
          'ui.mjs 에 넣고 t(lang, …) 으로 부르십시오 — 색인 다섯 중 넷은 이미 그렇게 합니다.\n',
        );
        throw new Error('번역 페이지의 meta description 이 영어입니다 — 위 목록을 고치십시오.');
      }

      /*
       * ── 열다섯 번째 게이트: 공유 카드가 실제로 존재하는가 ────────────────
       *
       * 2026-08-17. 대표사진이 없는 기사는 og:image 가 /og/<…>.png 로 간다.
       * 그 파일은 scripts/make-og.mjs 가 미리 그려 커밋해 둔 것이다.
       * **제목을 고치고 스크립트를 다시 안 돌리면, 링크만 살아 있고 그림이 없다.**
       * 공유 카드가 404 면 카카오톡·X 에는 아무 그림도 안 뜨는데,
       * 우리 화면에서는 아무 표시도 나지 않는다 — 이 저장소의 단골 실패 유형이다.
       */
      const missingCards = [];
      for (const f of pages) {
        const html = readFileSync(f, 'utf8');
        const m = /<meta property="og:image" content="[^"]*?(\/og\/[^"]+\.png)"/.exec(html);
        if (!m) continue;
        const card = join(root, m[1].replace(/^\//, ''));
        let ok = false;
        try { ok = statSync(card).size > 1000; } catch { ok = false; }
        if (!ok) missingCards.push(`${f.slice(root.length).replace(/\\/g, '/')} → ${m[1]}`);
      }
      if (missingCards.length) {
        logger.error(
          '\n\n공유 카드(og:image)가 가리키는 파일이 없습니다.\n\n  ' +
          [...new Set(missingCards)].slice(0, 10).join('\n  ') +
          (missingCards.length > 10 ? `\n  … 외 ${missingCards.length - 10}건` : '') +
          '\n\n`node scripts/make-og.mjs` 를 돌리십시오.\n' +
          '제목이나 확인일을 고치면 카드도 다시 그려야 합니다.\n' +
          '카드가 없으면 공유했을 때 그림이 안 뜨는데, 우리 화면에서는 아무 표시도 안 납니다.\n',
        );
        throw new Error('공유 카드 파일이 없습니다 — node scripts/make-og.mjs');
      }

      /*
       * ── 열여섯 번째 게이트: 상업 링크는 **화면에 나간 것**을 검사한다 ──────
       *
       * 2026-08-20. 운영자가 「가고싶은데 제휴가 없네」라고 했다. 링크는 있었다.
       * 2,884단어 아래에 있었을 뿐이다. 그래서 본문 문단 안에도 상업 링크를 걸 수 있게
       * `<Affiliate keyword="…"/>` 를 만들기로 했다.
       *
       * **그러면 상업 링크의 경로가 둘이 된다** — frontmatter→CtaBlock 과 본문→Affiliate.
       * 이 저장소가 다섯 번 데인 모양이 정확히 이것이다: 한 군데를 고치고 옆을 안 본다.
       * eSIM 편의 Klook 링크가 화면에서 사라진 것도, CTA 꼬리말이 세 번 거짓말한 것도 같은 원인이다.
       *
       * 그래서 **컴포넌트보다 이 게이트를 먼저 만들었다. 컴포넌트는 아직 없다.**
       * 순서를 뒤집으면 검사 없는 두 번째 경로가 하루라도 존재하게 되고,
       * 이 저장소에서 그런 하루는 늘 사고로 끝났다.
       *
       * 요점은 소스를 검사하지 않는다는 것이다 — 소스가 몇 갈래든 상관없이
       * **최종 HTML 에 나간 <a> 를 전부 본다.** 경로를 늘려도 검사가 저절로 따라온다.
       *
       * 세 가지를 본다.
       *   ① 열어 본 적 있는 주소인가        data/link-verified.json 에 있는가
       *   ② 추적 태그가 붙어 나갔는가        없으면 페이지는 멀쩡하고 수수료만 0 이다
       *   ③ rel="sponsored" 가 붙었는가      FTC 고지이자 검색엔진 신고다
       *
       * ⚠ **지금은 경고 단계다.** 이유는 아래 bad.length 블록의 주석에 적었다.
       */
      let ledger = null;
      try { ledger = JSON.parse(readFileSync('data/link-verified.json', 'utf8')); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }

      // 검사 자체가 오류를 내도 빌드를 세우지 않는다 — 아직 한 번도 못 돌려 봤기 때문이다
      try {
      if (ledger) {
        const known = new Set(Object.keys(ledger.verified ?? {}));
        const paid = Object.values(MERCHANTS).filter((m) => m.host && isAffiliate(m.name));
        const bad = [];
        const seen = new Set();

        for (const f of pages) {
          const html = readFileSync(f, 'utf8');
          const page = f.slice(root.length).replace(/\\/g, '/');
          for (const m of html.matchAll(/<a\b([^>]*?)href="(https:\/\/[^"]+)"([^>]*)>/g)) {
            const attrs = m[1] + m[3];
            const url = m[2].replace(/&amp;/g, '&');
            const host = paid.find((x) => url.includes(x.host));
            if (!host) continue;

            const base = url.split('?')[0];
            const key = `${page}|${url}`;
            if (seen.has(key)) continue;
            seen.add(key);

            if (!known.has(base) && !known.has(`${base}/`) && !known.has(base.replace(/\/$/, ''))) {
              bad.push(`${page}\n      ${base}\n      → data/link-verified.json 에 없습니다. 열어 보지 않은 링크는 발행되지 않습니다.`);
              continue;
            }
            const tags = Object.entries(host.tagParams ?? (host.tagParam ? { [host.tagParam]: host.tagValue } : {}));
            const missing = tags.filter(([k, v]) => !url.includes(`${k}=${v}`)).map(([k]) => k);
            if (missing.length) {
              bad.push(`${page}\n      ${url.slice(0, 90)}\n      → 추적 태그 ${missing.join(', ')} 가 빠졌습니다. 링크는 열리고 수수료만 0 이 됩니다.`);
            }
            if (!/rel="[^"]*sponsored/.test(attrs)) {
              bad.push(`${page}\n      ${url.slice(0, 90)}\n      → rel="sponsored" 가 없습니다. 이건 전환이 아니라 고지 의무입니다.`);
            }
          }
        }
        if (bad.length) {
          /*
           * ⚠ 지금은 **경고**다. 세울 수 있는데 일부러 안 세운다 (2026-08-20).
           *
           * 이 게이트를 쓴 날 샌드박스 디스크가 차서 `npx astro build` 를 한 번도
           * 못 돌려 봤다. 검증 못 한 검사를 hard gate 로 넣으면, 오탐 하나에
           * **윈도우 자동 푸시의 빌드가 실패하고 발행이 통째로 멈춘다.**
           * 2026-08-19 에 정확히 그 일이 있었고 그날 쓴 기사는 한 번도 못 올라갔다.
           *
           * 그러니 순서는 이렇다.
           *   ① 경고로 한 번 돌려서 **기존 링크가 전부 통과하는지** 눈으로 본다
           *   ② 통과하면 아래 throw 를 살린다 (한 줄이다)
           * 검사를 못 믿어서가 아니라, **못 돌려 봤기 때문에** 경고인 것이다.
           */
          logger.warn(
            '\n\n화면에 나간 상업 링크에 문제가 있습니다. (아직 경고 — 아래 주석 참조)\n\n  ' +
            [...new Set(bad)].slice(0, 12).join('\n\n  ') +
            (bad.length > 12 ? `\n\n  … 외 ${bad.length - 12}건` : '') +
            '\n\n이 검사는 **소스가 아니라 출력**을 봅니다.\n' +
            'frontmatter 로 넣든 본문에 <Affiliate/> 로 넣든 똑같이 걸립니다 —\n' +
            '경로를 늘려도 검사가 저절로 따라오게 하려고 이렇게 만들었습니다.\n',
          );
          // throw new Error('상업 링크 검사 실패 — 위 목록을 고치십시오.');   ← ①을 확인한 뒤 이 줄을 살린다
        }
      }
      } catch (e) {
        logger.warn(`상업 링크 검사가 스스로 오류를 냈습니다 — 검사만 건너뜁니다: ${e.message}`);
      }

      logger.info(`출력 점검: ${pages.length}쪽 — 노출된 마크다운 기호 없음 · 번역면에 남은 영어 화면문구 없음 · 공유 카드 전부 존재 · 상업 링크 점검(경고 단계)`);
    },

    'astro:build:start': ({ logger }) => {
        const fail = [];
        const warn = [];
        const shapes = [];   // 절 구성 비교용 — 판정은 반복문이 끝난 뒤

        /*
         * 어떤 원문이 대표사진을 가지고 있는가 — 「컬렉션/slug」 로 미리 모은다 (2026-08-22).
         *
         * 아래 hero-translation 게이트가 이걸 본다.
         * 번역본은 사진을 안 적고 heroAlt 만 적는데, 원문에 사진이 있는지 모르면
         * 「heroAlt 가 빠졌다」와 「원래 사진이 없는 기사다」를 구분할 수 없다.
         */
        const originHasHero = new Set();
        for (const file of walk(CONTENT_DIR)) {
          const rel = file.replace(/\\/g, '/').replace(`${CONTENT_DIR}/`, '');
          const parts = rel.replace(/\.mdx?$/, '').split('/');
          if (parts.length !== 2) continue;                 // 언어 폴더가 끼어 있으면 번역본이다
          const head = readFileSync(file, 'utf8');
          if (/^hero:/m.test(head.slice(0, head.indexOf('\n---', 4) + 4))) originHasHero.add(parts.join('/'));
        }

        for (const file of walk(CONTENT_DIR)) {
          const text = readFileSync(file, 'utf8');
          const slug = basename(file).replace(/\.mdx?$/, '');
          const fm = text.slice(0, text.indexOf('\n---', 4) + 4);
          const body = text.slice(fm.length);

          // ── 1. 대표사진 ─────────────────────────────────────────
          /*
           * 번역본은 대표사진 검사를 하지 않는다 (2026-08-17).
           *
           * 번역본은 **같은 기사의 다른 언어판**이지 새 기사가 아니다.
           * 원문이 이미 이 검사를 통과했고, 사진을 frontmatter 에 복사해 두면
           * 원문에서 사진을 바꿀 때 번역본만 옛 사진을 가리키게 된다 —
           * 이 사이트가 오늘 하루에 여섯 번 반복한 바로 그 모양이다.
           * 사진은 한 곳에만 적는다.
           */
          const isTranslation = /^translation:/m.test(fm);
          if (!isTranslation && !/^hero:/m.test(fm) && !HERO_EXEMPT[slug]) {
            fail.push(
              `${slug}: 대표사진이 없습니다.\n` +
              '      사진을 넣거나, 넣을 수 없다면 그 이유를 ' +
              'src/integrations/content-quality.mjs 의 HERO_EXEMPT 에 적으십시오.',
            );
          }

          // ── 1-b. 번역본의 대표사진 ──────────────────────────────
          /*
           * 2026-08-22. 위 주석이 「사진은 한 곳에만 적는다」고 선언해 놓고
           * **어디에도 그 규칙을 강제하지 않고 있었다.** 결과가 두 갈래로 갈렸다:
           *
           *   사진을 안 적은 번역본 9쪽 → 일본어·중국어 페이지에 대표사진이 아예 없었다
           *   적은 번역본 9쪽        → 같은 사실이 세 군데에 적혀, 원문에서 바꾸면 갈라졌다
           *
           * 이제 코드가 원문에서 물려받는다 (src/config/hero.mjs).
           * 그러니 번역본은 사진을 적으면 안 되고, 대신 자기 언어의 alt 를 적어야 한다.
           *
           * alt 를 안 적었을 때 원문의 영어 alt 로 조용히 떨어뜨리지 않는 이유 —
           * ui.mjs 의 t() 가 「영어로 대체하지 않습니다」라고 던지는 것과 같다.
           * 반쯤 영어인 페이지는 미완성으로 읽히고, 조용히 메우면 아무도 모른다.
           */
          if (isTranslation) {
            const of = fm.match(/^\s+of:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim();
            if (/^hero:/m.test(fm)) {
              fail.push(
                `${slug} (${file}): 번역본에는 hero 를 적지 않습니다.\n` +
                '      사진 파일·라이선스·출처·크레딧은 **원문 한 곳**에만 적고,\n' +
                '      번역본은 그 언어의 대체텍스트만 heroAlt 로 적습니다.\n' +
                '      같은 사실을 세 군데에 적어 두면 원문에서 사진을 바꿀 때 번역본만 옛 사진에 남습니다.',
              );
            } else if (of && originHasHero.has(of) && !/^heroAlt:/m.test(fm)) {
              fail.push(
                `${slug} (${file}): heroAlt 가 없습니다.\n` +
                `      원문(${of})에는 대표사진이 있습니다. 그 사진의 대체텍스트를 이 언어로 적으십시오.\n` +
                '      영어 alt 를 그대로 쓰지 않습니다 — 화면 낭독기가 이 문단들 사이에서 갑자기 영어를 읽습니다.',
              );
            }
          }

          // ── 1-c. 코드 블록 ──────────────────────────────────────
          /*
           * 2026-08-23 운영자 지적: 「글중에 이렇게 컴퓨터 dos 프로그램에서 바로 온듯한
           * 박스는 수정이 안되나? 글을 보다보면 중간에 가끔 이런 글들을 본다.」
           *
           * 맞는 지적이었고, 세어 보니 **10편에 21개**였다. 그런데 21개를 열어 보니
           * 놀랍게도 전부 같은 종류였다 — **원래 표였어야 할 것**이다.
           *   한국어 회화 열 마디 · 한글 자모 조합 · ATM 로고 행 · AREX 역별 요금 ·
           *   통신사별 수령 장소 · 북촌 규정 · 올리브영 필터 목록 · 페리페라 색 이름
           * 하나도 코드가 아니었다. **이 사이트에는 코드가 한 줄도 없다.**
           *
           * 한글 편이 증거다. 같은 기사 안에서 한 곳은 마크다운 표를 쓰고
           * 스무 줄 아래에서는 같은 성격의 내용을 코드 펜스에 넣었다.
           * 고른 것이 아니라 그때그때 편한 대로 쓴 것이고, 그래서 반복됐다.
           *
           * 왜 나쁜가. 코드 블록은 **검은 바탕에 고정폭 글꼴**로 렌더링된다.
           * 여행 기사 한복판에 개발자 콘솔이 튀어나온 것처럼 보이고,
           * 줄맞춤을 공백으로 했기 때문에 **좁은 화면에서 가로로 잘린다** —
           * 표는 접히는데 펜스는 안 접힌다. 읽는 사람이 손해를 본다.
           *
           * 그래서 예외를 두지 않는다. 표로 쓸 것을 표로 쓰게 만든다.
           */
          if (/^```/m.test(body)) {
            const n = (body.match(/^```/gm) ?? []).length;
            fail.push(
              `${slug} (${file}): 코드 블록 ${Math.ceil(n / 2)}개.\n` +
              '      이 사이트에는 코드가 없습니다. 여기 들어가는 것은 늘 **표**였습니다 —\n' +
              '      | 항목 | 값 | 형태로 다시 쓰십시오. 마크다운 표는 좁은 화면에서 접히지만\n' +
              '      코드 블록은 공백 줄맞춤이라 가로로 잘립니다.',
            );
          }

          // ── 2. 캡션 없는 사진 ───────────────────────────────────
          // 캡션은 사진이 말하지 않는 것을 말하는 자리다.
          // 없으면 사진이 그냥 장식으로 붙은 것이고, 그건 우리 방식이 아니다.
          const figures = body.match(/<Figure[\s\S]*?\/>/g) ?? [];
          const noCaption = figures.filter((f) => !/caption=/.test(f));
          if (noCaption.length) {
            fail.push(`${slug}: 캡션 없는 사진 ${noCaption.length}장. 캡션은 선택이 아닙니다.`);
          }

          // ── 3. 본문 시각 요소 ───────────────────────────────────
          // 대표사진만 있고 본문이 글자만이면 끝까지 읽히지 않는다.
          const charts = (body.match(/<Chart\w+/g) ?? []).length;
          if (figures.length + charts === 0) {
            warn.push(`${slug}: 본문에 사진·도표가 하나도 없습니다 (대표사진만 있음)`);
          }

          // ── 3-b. 사진이 전부 한 곳인가 ──────────────────────────
          //
          // 2026-08-14 운영자: "궁궐 사진이 아직 중복적으로 사용된 것이 보인다".
          //   파일은 전부 달랐다. 그런데 14장이 **전부 경복궁**이었다.
          //   5대궁 기사도, 단청도, 한복도 경복궁만 보여준다.
          //   파일명이 다른 것과 다른 곳을 보여주는 것은 다른 말이다.
          //
          //   파일명 첫 토큰을 피사체로 본다 (gyeongbokgung-geunjeongjeon-hall → gyeongbokgung).
          //   기사 슬러그에 그 이름이 없는데 사진이 전부 그 한 곳이면 알린다.
          const shots = [...text.matchAll(IMG_SUBJ)].map((m) => m[1].split('-')[0].toLowerCase());
          const subjects = new Set(shots);
          if (shots.length >= 2 && subjects.size === 1) {
            const only = [...subjects][0];
            if (!slug.toLowerCase().includes(only)) {
              warn.push(
                `${slug}: 사진 ${shots.length}장이 전부 '${only}' 한 곳입니다. ` +
                '읽는 사람에게는 같은 곳을 반복해 보여주는 것으로 읽힙니다.',
              );
            }
          }

          // ── 4. 제목 길이 ────────────────────────────────────────
          /*
           * 2026-08-16 수정. 이 게이트는 title 만 보고 있었다.
           * 그런데 검색 결과와 <title> 에 실제로 나가는 것은 **seoTitle 이 있으면 seoTitle** 이다.
           * 그래서 제목을 길게 쓰고 seoTitle 을 짧게 단 기사까지 경고가 났다 —
           * 게이트가 틀렸고, 틀린 경고는 진짜 경고를 묻는다.
           */
          const title = /^title:\s*"(.+?)"\s*$/m.exec(fm)?.[1];
          const seoTitle = /^seoTitle:\s*"(.+?)"\s*$/m.exec(fm)?.[1];
          const shown = seoTitle ?? title;
          if (shown && shown.length > TITLE_MAX) {
            warn.push(
              `${slug}: 검색에 나가는 제목 ${shown.length}자 — 잘립니다 (${TITLE_MAX}자 권장)` +
              (seoTitle ? '' : '  ← seoTitle 을 달면 본문 제목은 길게 둘 수 있습니다'),
            );
          }

          // ── 5. 내부 링크 ────────────────────────────────────────
          // 한 편만 읽고 떠나면 쌓인 글이 일하지 않는다.
          /*
           * 2026-08-16 수정. 이 게이트는 `/en/` 로 시작하는 링크만 셌다.
           * 번역본은 당연히 `/ja/`, `/zh-hans/` 로 링크한다 — 그게 맞는 동작인데
           * 게이트가 전부 「링크 없음」으로 잡아서, **일·중 기사 10편이 전부 거짓 경고**였다.
           * 거짓 경고가 10건이면 진짜 2건이 안 보인다. 그래서 언어를 보고 센다.
           */
          const lang = /^lang:\s*([\w-]+)/m.exec(fm)?.[1] ?? 'en';
          const linkRe = new RegExp(`\\]\\(/${lang}/`, 'g');
          const links = (body.match(linkRe) ?? []).length;
          if (links === 0) warn.push(`${slug} (${lang}): 다른 기사로 가는 링크가 없습니다`);

          // ── 6. 절 구성을 모아 둔다 (판정은 반복문이 끝난 뒤) ──────
          shapes.push({
            slug,
            at: /^publishedAt:\s*(\S+)/m.exec(fm)?.[1] ?? '',
            // **마지막 절 하나**를 본다.
            //
            // 처음에는 절 제목 전체를 이어붙여 비교했다. 만들어 놓고 시험해 보니
            // **한 번도 안 걸렸다.** 글마다 절 제목이 조금씩 달라 문자열이 늘 달랐기 때문이다.
            // 안 터지는 게이트는 게이트가 아니라 장식이다.
            //
            // 실제로 세어 보니 냄새는 제목이 아니라 **꼬리**에 있었다:
            //   30편 중 **29편**이 'What this article does not claim' 으로 끝난다.
            // 독자가 세 편째에 알아채는 것이 바로 이것이다. 그러면 이것을 겨눠야 한다.
            shape: ((body.match(/^##\s+(.+)$/gm) ?? []).at(-1) ?? '')
              .replace(/^##\s+/, '').trim().toLowerCase(),
            words: body.split(/\s+/).length,
          });
        }

        /*
         * ── 7. 같은 틀로 찍어내지 않았는가 ──────────────────────────
         *
         * 2026-08-16 운영자 지시: "AI 자동화의 느낌과 냄새를 완전히 제거하자."
         * 외부 평가도 같은 것을 지적했다 — 개별 항목은 훌륭한데 30편이 같은 순서,
         * 같은 말투라 몇 편만 읽으면 자동 생산 시스템이라는 것이 느껴진다고.
         *
         * 이 규칙은 이미 _자동화-지시문.md 에 있었다.
         *   "개념 설명 글에 고지할 게 없으면 절을 통째로 뺀다"
         * 그런데 30/30 이 모든 절을 다 갖고 있다. **글로 적힌 규칙은 안 지켜졌다.**
         * 안 지켜지는 규칙은 규칙이 아니라 희망이다. 그래서 코드로 내린다.
         *
         * 적용 시점을 나눈 이유.
         *   오늘 기존 30편을 다시 쓸 수는 없다. 지금 전면 적용하면 빌드가 영영 안 선다.
         *   그러면 이 게이트는 꺼지거나 우회될 것이고, 우회되는 게이트는 없는 것만 못하다.
         *   **오늘 이후 쓰는 글부터 적용한다.** 기존 편은 경고로만 계속 보인다 —
         *   잊지 않기 위해서다. 부채를 조용히 덮으면 갚지 않게 된다.
         */
        const SHAPE_RULE_FROM = '2026-08-16';
        const RUN = 4;   // 연속 4편이 같은 구성이면 세운다 = '직전 3편과 같으면 안 된다'

        const sorted = shapes.filter((s) => s.at).sort((a, b) => a.at.localeCompare(b.at));
        for (let i = RUN - 1; i < sorted.length; i++) {
          const run = sorted.slice(i - RUN + 1, i + 1);
          if (run.some((r) => !r.shape)) continue;
          if (new Set(run.map((r) => r.shape)).size !== 1) continue;

          const line = run.map((r) => r.slug).join('\n    ');
          if (run[run.length - 1].at >= SHAPE_RULE_FROM) {
            fail.push(
              `연속 ${RUN}편이 똑같은 절로 끝납니다 — "${run[0].shape}"\n    ${line}\n\n` +
              '    같은 틀로 찍은 글은 몇 편만 읽어도 티가 납니다.\n' +
              '    고지할 것이 없으면 고지 절을 **통째로 빼고**, 할 말이 끝났으면 거기서 끝내십시오.\n' +
              '    절을 하나 더 채우려고 쓴 문단은 독자도 그렇게 읽습니다.',
            );
            break;
          }
        }

        // 기존 편의 쏠림은 경고로 계속 보여준다 — 갚아야 할 부채다.
        const old = shapes.filter((s) => s.at && s.at < SHAPE_RULE_FROM);
        const byShape = new Map();
        for (const s of old) byShape.set(s.shape, (byShape.get(s.shape) ?? 0) + 1);
        const worst = [...byShape.entries()].sort((a, b) => b[1] - a[1])[0];
        if (worst && worst[1] >= 3) {
          warn.push(
            `${SHAPE_RULE_FROM} 이전 기사 ${old.length}편 중 ${worst[1]}편이 절 구성이 동일합니다 ` +
            '— 재확인 주기에 한 편씩 손보십시오',
          );
        }

        /**
         * ── 「무엇이 막혔나요」 색인이 조용히 낡는 것을 막는다 ──────────
         *
         * 2026-08-17 실측: 기사 35편 중 색인에 든 것이 **16편**이었다.
         * 3D Secure 편처럼 이번 주에 쓴 가장 좋은 글도 빠져 있었다.
         * 아무도 뭘 잘못하지 않았다. **그냥 안 넣었고, 안 넣은 걸 아무도 몰랐다.**
         *
         * 그렇다고 전부 넣을 수는 없다 — 촬영지·계절 기사는 '막힌 순간' 이 아니다.
         * 그래서 넣거나, **이유를 적고 빼거나** 둘 중 하나를 하게 만든다.
         * 사진 예외 목록과 같은 방식이다. 이유를 적기 귀찮으면 넣게 된다.
         */
        const stuckExempt = {
          // 갈 곳 이야기지 막힌 순간이 아니다. 독자가 '어떡하지' 하고 검색하지 않는다
          'geoje-island-what-to-see': '촬영지·여행지 소개. 막힌 순간이 없다',
          'jjimjilbang-what-it-costs-and-what-it-is':
            '놀거리 소개. 「무엇이 막혔나」가 아니라 「이 낱말이 무엇을 덮는가」에 답한다 — '
            + '막혀서 검색하는 글이 아니라, 가기 전에 값과 시간을 알고 가는 글이다',
          'goblin-jumunjin-breakwater': '촬영지 소개',
          'gyeongju-at-night-silla-capital': '여행지 소개',
          'jeju-when-life-gives-you-tangerines': '섬 자체를 설명하는 글. 막힌 순간이 아니라 「왜 가나」에 답한다',
          'itaewon-alone-what-to-eat-buy-and-when-to-go':
            '동네를 설명하는 글. 「무엇이 막혔나」가 아니라 「혼자 가도 되나」에 답한다 — '
            + '막힌 순간이 아니라 망설이는 순간이다',
          'kpop-demon-hunters-still-popular-korea': '현상 분석. 독자가 막혀서 찾는 글이 아니다',
          'yeokjuhaeng-korean-chart-reverse-running': '현상 해설',
          'what-koreans-search-for-trends-2026': '데이터 해설',
          // 계획 단계의 글이다. 막힌 게 아니라 아직 안 떠났다
          'best-time-to-visit-korea-calendar': '출발 전 계획. 현장에서 막히는 순간이 아니다',
          'when-do-cherry-blossoms-bloom-korea': '출발 전 계획',
          'korea-autumn-foliage-when-and-where': '출발 전 계획',
          'when-does-it-snow-in-korea': '출발 전 계획',
          'korea-summer-heat-humidity': '출발 전 계획. 현장 대처는 아직 안 썼다 — 쓰면 색인에 넣는다',
          // 배경 지식. 몰라도 통과에 지장이 없다
          'dancheong-why-palaces-are-painted': '배경 지식. 몰라도 막히지 않는다',
          'what-is-donggung-the-east-palace': '배경 지식',
        };
        try {
          const stuck = JSON.parse(readFileSync('data/stuck.json', 'utf8'));
          const listed = new Set(stuck.groups.flatMap((g) => g.items.map((i) => i.href)));
          const drifted = [];
          for (const file of walk(CONTENT_DIR)) {
            const slug = basename(file).replace(/\.mdx?$/, '');
            let sec = basename(join(file, '..'));
            /*
             * 번역본은 이 검사의 대상이 아니다 (2026-08-17).
             *
             * 「무엇이 막혔나요」 색인은 **영어로 쓰인 물건**이고,
             * 항목의 answer 도 영어다. 번역본이 색인에 없다고 표시하면
             * 영어 색인에 일본어 기사를 넣으라는 뜻이 되는데, 그건 틀렸다.
             * 색인 자체를 언어별로 만들 때 이 검사도 언어별로 돈다.
             */
            const fm = readFileSync(file, 'utf8').slice(0, 800);
            if (/^translation:/m.test(fm)) continue;
            if (listed.has(`${sec}/${slug}`) || stuckExempt[slug]) continue;
            drifted.push(`${sec}/${slug}`);
          }
          if (drifted.length) {
            fail.push(
              `「무엇이 막혔나요」 색인에 없고 예외 사유도 없는 기사 ${drifted.length}건.\n` +
              drifted.map((d) => `      · ${d}`).join('\n') + '\n\n' +
              '    둘 중 하나를 하십시오.\n' +
              '      ① data/stuck.json 에 넣는다 — 독자의 말로 된 문제 + 한 줄 답\n' +
              '      ② stuckExempt 에 **이유를 적고** 뺀다 (막힌 순간이 아니라면)\n\n' +
              '    2026-08-17 에 35편 중 19편이 이렇게 조용히 빠져 있었습니다.',
            );
          }
        } catch (e) {
          if (e.code !== 'ENOENT') throw e;
        }

        /**
         * ── 상업 링크가 조용히 사라지는 것을 막는다 ───────────────────
         *
         * 2026-08-16 밤에 찾았다. eSIM 편 frontmatter 에 Klook 제휴 링크가
         * 적혀 있었는데 **화면에는 없었다.** decode 와 hangul 템플릿이
         * CtaBlock 을 렌더링하지 않았기 때문이다.
         * 스키마는 통과, 빌드도 통과, 링크만 사라진다. **아무 소리도 안 났다.**
         *
         * 이 사이트에서 다섯 번 반복된 모양이다 — 한 군데 고치고 옆을 안 본 것.
         * 그래서 기억이 아니라 **파일을 읽어서** 확인한다.
         * 새 축을 만들면 이 검사가 저절로 그 축을 포함한다.
         */
        const PAGE_DIR = 'src/pages/[lang]';
        for (const sec of readdirSync(PAGE_DIR)) {
          const tpl = join(PAGE_DIR, sec, '[slug].astro');
          let src;
          try { src = readFileSync(tpl, 'utf8'); } catch { continue; }
          if (!/<CtaBlock/.test(src)) {
            fail.push(
              `${sec} — 기사 템플릿이 CtaBlock 을 렌더링하지 않습니다 (${tpl}).\n` +
              '    이 축의 기사가 visitKorea / bringKoreaHome 링크를 적어도\n' +
              '    화면에는 아무것도 나오지 않고, 오류도 나지 않습니다.\n' +
              '    실제로 eSIM 편의 Klook 제휴 링크가 이렇게 사라져 있었습니다.',
            );
          }
          // 상단 고지도 같은 방식으로 지킨다 (2026-08-16 외부 검토 수용).
          // 고지는 손으로 쓰지 않고 링크 배열에서 계산되므로,
          // 템플릿이 컴포넌트를 빼먹는 것이 이 고지가 사라지는 유일한 경로다.
          if (!/<AffiliateTopNote/.test(src)) {
            fail.push(
              `${sec} — 기사 템플릿이 AffiliateTopNote 를 렌더링하지 않습니다 (${tpl}).\n` +
              '    제휴 링크가 있는 기사의 상단 고지가 이 축에서만 조용히 빠집니다.',
            );
          }
        }

        /**
         * ── 공개 대장이 없는 주소를 가리키는 것을 막는다 (여덟 번째) ──────
         *
         * 2026-08-17 외부 검토가 잡았다.
         *   대장에 /en/guides/korean-street-food-hidden-pork-and-fish/ 라고 적혀 있었다.
         *   실제 주소는 /en/now/... 다. 축을 옮기고 대장을 안 고친 것이다.
         *
         * 이게 왜 다른 깨진 링크보다 나쁜가.
         *   대장은 **우리가 틀렸다고 인정한 기록**이다.
         *   "여기서 틀렸습니다" 하고 가리킨 곳에 글이 없으면,
         *   정정을 확인하려던 사람이 확인하지 못한다.
         *   투명성 장치가 작동하지 않으면 투명성의 **주장만** 남는다.
         *
         * 「무엇이 막혔나요」 색인에는 이 검사가 있었는데 대장에는 없었다.
         * 같은 모양을 또 한 군데만 고친 것이다.
         */
        const LEDGER_SCAN_DIR = 'src/content';
        const liveUrls = new Set();
        for (const sec of readdirSync(LEDGER_SCAN_DIR)) {
          let files;
          try { files = readdirSync(join(LEDGER_SCAN_DIR, sec)); } catch { continue; }
          for (const f of files) {
            if (!/\.mdx?$/.test(f)) continue;
            const raw = readFileSync(join(LEDGER_SCAN_DIR, sec, f), 'utf8');
            const lang = (raw.match(/^lang:\s*(\S+)/m) ?? [])[1] ?? 'en';
            liveUrls.add(`/${lang}/${sec}/${f.replace(/\.mdx?$/, '')}/`);
          }
        }
        let ledger;
        try {
          ledger = JSON.parse(readFileSync('data/ledger.json', 'utf8'));
        } catch { ledger = null; }
        if (ledger) {
          const rows = Object.values(ledger)
            .filter(Array.isArray)
            .flat()
            .filter((r) => r && typeof r.article === 'string');
          for (const r of rows) {
            // 사이트 밖(정책 페이지 등)을 가리키는 항목은 이 검사의 대상이 아니다.
            if (!/^\/[a-z]{2}\/[a-z]+\//.test(r.article)) continue;
            if (!liveUrls.has(r.article)) {
              fail.push(
                `공개 대장이 없는 기사를 가리킵니다 — ${r.article}\n` +
                `    항목 : ${(r.wrong ?? r.title ?? '').slice(0, 70)}\n` +
                '    대장은 우리가 틀렸다고 인정한 기록입니다.\n' +
                '    가리킨 자리에 글이 없으면 정정을 확인할 방법이 없습니다.',
              );
            }
          }
        }

        /**
         * ── 상품 하나에 이름 하나 (아홉 번째) ────────────────────────
         *
         * 2026-08-17. 같은 Klook 상품이 두 곳에 붙어 있었는데
         * eSIM 편에서는 "data only — no 010 number" 로 고쳤고
         * Arrival 페이지에서는 "buy before you fly" 로 남아 있었다.
         * 게다가 Arrival 본문은 "gives you a working 010 number" 라고 썼다.
         *
         * **한 사이트가 같은 물건을 두고 두 말을 했다.**
         * 독자에게는 둘 다 우리 말이라, 어느 쪽을 믿어도 우리가 틀린 것이 된다.
         *
         * 정식 라벨은 src/config/products.mjs 한 곳에만 있다.
         * frontmatter 가 같은 URL 에 다른 라벨을 쓰면 여기서 세운다.
         */
        for (const file of walk(CONTENT_DIR)) {
          const text = readFileSync(file, 'utf8');
          const slug = basename(file).replace(/\.mdx?$/, '');
          for (const [url, allowed] of Object.entries(ALLOWED_LABELS)) {
            const i = text.indexOf(url);
            if (i === -1) continue;
            // 같은 항목 안의 label 을 찾는다 (URL 바로 앞 몇 줄).
            const near = text.slice(Math.max(0, i - 400), i);
            const label = [...near.matchAll(/label:\s*"([^"]+)"/g)].at(-1)?.[1];
            if (label && !allowed.has(label)) {
              fail.push(
                `${slug}: 상품 라벨이 정식 이름과 다릅니다.\n` +
                `    상품 : ${url}\n` +
                `    정식 : ${[...allowed].map((l) => `"${l}"`).join(' / ')}\n` +
                `    기사 : "${label}"\n` +
                '    같은 물건을 두 이름으로 부르면 둘 중 하나는 독자를 속입니다.\n' +
                '    고치려면 src/config/products.mjs 를 바꾸십시오 (거기가 유일한 자리입니다).',
              );
            }
          }
        }

        /**
         * ── 번역본이 낡은 채로 발행되는 것을 막는다 (열 번째) ────────
         *
         * 2026-08-17, 다국어 구조를 켜면서 **번역보다 먼저** 넣는다.
         *
         * 이틀 동안 eSIM 편을 네 번 고쳤다. 4개 언어였으면 열여섯 번이다.
         * 그리고 그 이틀 동안 내가 「한 군데 고치고 옆을 안 보는」 실수를 여섯 번 했다.
         * **원문이 바뀐 것을 사람이 기억해서 번역본을 따라 고칠 수는 없다.**
         *
         * 판정은 날짜 하나로 끝난다.
         *   번역본의 translation.sourceCheckedAt  <  원문의 checkedAt   → 낡음
         *
         * 그리고 machine_translated 는 어떤 경우에도 발행되지 않는다.
         * 기계번역을 그대로 내보내는 것이 정확히 scaled content abuse 이고,
         * 우리가 파는 「확인한 것만 쓴다」는 약속이 언어 수만큼 깨진다.
         */
        const byId = new Map();          // 'now/slug' → { checkedAt, file }
        const translations = [];
        for (const file of walk(CONTENT_DIR)) {
          const text = readFileSync(file, 'utf8');
          const slug = basename(file).replace(/\.mdx?$/, '');
          const sec = file.split(/[\\/]/).at(-2);
          const fm = text.slice(0, text.indexOf('\n---', 4) + 4);
          const checkedAt = /^checkedAt:\s*(\S+)/m.exec(fm)?.[1] ?? '';
          const lang = /^lang:\s*(\S+)/m.exec(fm)?.[1] ?? 'en';
          if (lang === 'en') byId.set(`${sec}/${slug}`, { checkedAt, slug });
          if (/^translation:/m.test(fm)) {
            translations.push({
              slug, lang,
              of: /^\s+of:\s*['"]?([^'"\n]+)/m.exec(fm)?.[1]?.trim() ?? '',
              srcAt: /^\s+sourceCheckedAt:\s*(\S+)/m.exec(fm)?.[1] ?? '',
              status: /^\s+status:\s*(\S+)/m.exec(fm)?.[1] ?? '',
              factsAt: /^\s+factsVerifiedAt:\s*(\S+)/m.exec(fm)?.[1] ?? '',
              reviewer: /^\s+reviewer:\s*(\S+)/m.exec(fm)?.[1] ?? '',
            });
          }
        }
        for (const t of translations) {
          /*
           * 2026-08-17. 원어민 검수자가 없다는 것이 **영구 조건**이 됐다.
           * 그러면 native_reviewed 는 실수로든 습관으로든 켜지면 안 된다.
           * 켜려면 읽은 사람의 실명이 있어야 한다. 이름 없는 검수는 검수가 아니다.
           */
          if (t.status === 'native_reviewed' && !t.reviewer) {
            fail.push(
              `${t.slug} (${t.lang}): native_reviewed 인데 reviewer 가 없습니다.\n` +
              '    누가 읽었는지 적을 수 없다면 읽지 않은 것입니다.\n' +
              '    원어민 검수가 없는 것이 현재 운영 조건입니다 —\n' +
              '    ai_translated_facts_verified 를 쓰고 화면에 그대로 고지하십시오.',
            );
            continue;
          }
          /*
           * 사실 확인 날짜가 없으면 「사실은 확인했다」고 말할 수 없다.
           * 이 상태값의 이름 자체가 약속이므로, 약속의 근거를 강제한다.
           */
          if (t.status === 'ai_translated_facts_verified' && !t.factsAt) {
            fail.push(
              `${t.slug} (${t.lang}): factsVerifiedAt 이 없습니다.\n` +
              '    이 상태는 「사실을 1차 출처로 다시 확인했다」는 뜻입니다.\n' +
              '    확인한 날을 적을 수 없다면 확인하지 않은 것이고,\n' +
              '    그러면 machine_translated 이지 이 상태가 아닙니다.',
            );
            continue;
          }
          if (t.status === 'machine_translated') {
            fail.push(
              `${t.slug} (${t.lang}): 기계번역 상태로는 발행할 수 없습니다.\n` +
              '    사람이 읽고 status 를 reviewed 로 바꾸기 전에는 나가지 않습니다.\n' +
              '    읽지 않은 번역을 내보내면 「확인한 것만 쓴다」가 언어 수만큼 거짓이 됩니다.',
            );
            continue;
          }
          const src = byId.get(t.of);
          if (!src) {
            fail.push(
              `${t.slug} (${t.lang}): 번역 원문을 찾을 수 없습니다 — translation.of = "${t.of}"\n` +
              '    원문이 없는 번역본은 갱신 여부를 영영 판정할 수 없습니다.',
            );
            continue;
          }
          if (src.checkedAt && t.srcAt && src.checkedAt > t.srcAt) {
            fail.push(
              `${t.slug} (${t.lang}): 번역본이 낡았습니다.\n` +
              `    원문 확인일 : ${src.checkedAt}\n` +
              `    번역 기준일 : ${t.srcAt}\n` +
              '    원문이 그 뒤에 바뀌었습니다. 번역을 갱신하고 sourceCheckedAt 을 맞추거나,\n' +
              '    당장 못 하면 이 번역본을 draft 로 내리십시오.\n' +
              '    **틀린 채로 서 있는 번역이 없는 번역보다 나쁩니다.**',
            );
          }
        }

        /**
         * ── 껍데기가 반쯤 영어인 채로 나가는 것을 막는다 (열한 번째) ──
         *
         * 2026-08-17. 일본어 기사 5편을 쓰고 빌드했더니 **기사만** 일본어였다.
         * 헤더·푸터·목록 페이지가 전부 영어로 남아 있었고, 빌드는 통과했다.
         * 화면을 열어 보기 전에는 아무도 몰랐다 — 이 사이트의 단골 실패 유형이다.
         *
         * 운영자 판단이 분명했다: 「들어가면 껍데기까지 그 언어로 보여야 한다.」
         *
         * 그래서 **발행 중인 모든 언어가 영어와 같은 키를 다 갖고 있어야** 통과한다.
         * 없는 문구를 영어로 대체하는 방식은 쓰지 않는다 —
         * 대체는 문제를 숨기는 것이지 푸는 것이 아니다.
         */
        {
          const base = flatKeys(UI.en);
          for (const lang of LOCALES) {
            if (lang === 'en') continue;
            const have = new Set(flatKeys(UI[lang] ?? {}));
            const missing = base.filter((k) => !have.has(k));
            if (missing.length) {
              fail.push(
                `화면 문구가 ${missing.length}개 빠졌습니다 — ${lang}\n` +
                missing.slice(0, 12).map((k) => `      · ${k}`).join('\n') +
                (missing.length > 12 ? `\n      … 외 ${missing.length - 12}개` : '') + '\n' +
                '    src/config/ui.mjs 에 추가하거나, 준비될 때까지 brand.mjs 의\n' +
                '    LOCALES 에서 이 언어를 빼십시오.\n' +
                '    **반쯤 번역된 화면은 「번역이 있다」가 아니라 「미완성이다」로 읽힙니다.**',
              );
            }
          }
        }

        /**
         * ── 번역본에서 상업 링크가 조용히 사라지는 것을 막는다 (열두 번째) ──
         *
         * 2026-08-17 운영자 지적: *"일본어와 중국어 버전은 제휴가 없네"*
         *
         * 세어 보니 사실이었다.
         *   en  6페이지 · ja 1페이지 · zh-hans 1페이지
         * 원문에는 붙어 있는 링크를 **번역할 때 frontmatter 에서 빠뜨렸다.**
         *
         * 이게 왜 다른 누락보다 나쁜가.
         *   번역본이 원문보다 **많으면** 게이트가 잡는다 (라벨 대조).
         *   그런데 **적은 것**은 아무도 안 잡는다. 오류도 경고도 안 난다.
         *   이 사이트에서 제일 비쌌던 실패가 전부 이 모양이었다 —
         *   **오류 없이 사라지는 것.**
         *
         * 일부러 빼는 경우는 있다. 그 상품이 그 시장에 없거나,
         * 그 독자에게는 다른 상품이 맞을 때. 그러면 **이유를 적어야 통과한다.**
         * 대표사진 예외와 같은 방식이다 — 이유를 적기 귀찮으면 링크를 넣게 된다.
         */
        const CTA_DROP_EXEMPT = {
          // 'ja/scenes/some-article': '그 상품은 일본에서 안 팔린다. 확인일 2026-08-17',
        };
        {
          const byId = new Map();     // 영어 원문 id → 상업 링크 URL 집합
          const trans = [];
          for (const file of walk(CONTENT_DIR)) {
            const text = readFileSync(file, 'utf8');
            const fm = text.slice(0, text.indexOf('\n---', 4) + 4);
            const slug = basename(file).replace(/\.mdx?$/, '');
            /*
             * 번역본은 src/content/<섹션>/<언어>/<slug>.mdx 라서
             * 한 단계 위가 언어 폴더다. 섹션은 그 위에 있다.
             * 이걸 놓치면 예외 키가 'ja/ja/...' 로 나오고, 적어 둔 예외가 영영 안 걸린다.
             */
            const parent = basename(join(file, '..'));
            const lang = /^lang:\s*(\S+)/m.exec(fm)?.[1] ?? 'en';
            const sec = parent === lang ? basename(join(file, '..', '..')) : parent;
            /*
             * 2026-08-17 저녁. 이 줄은 원래 klook.com 만 찾았다.
             * 그날 아침 Trip.com 을 붙였고, **경주 일본어·중국어판에서 Trip.com 링크가
             * 조용히 사라졌는데 이 게이트가 통과 판정을 냈다.**
             * 이 게이트는 정확히 그 사고를 막으려고 쓴 것이다 — 한 상점 뒤에 무력해졌다.
             * → 상점 목록에서 host 를 읽는다. 새 제휴가 붙으면 저절로 따라온다.
             */
            const urls = new Set(
              [...fm.matchAll(/^\s+url:\s*"(https?:\/\/[^"]+)"/gm)]
                .map((m) => m[1])
                .filter((u) => MERCHANT_HOSTS.some((h) => u.includes(h))),
            );
            if (lang === 'en') byId.set(`${sec}/${slug}`, urls);
            else if (/^translation:/m.test(fm)) {
              trans.push({ key: `${lang}/${sec}/${slug}`, lang, slug,
                of: /^\s+of:\s*['"]?([^'"\n]+)/m.exec(fm)?.[1]?.trim() ?? '', urls });
            }
          }
          for (const t of trans) {
            const src = byId.get(t.of);
            if (!src) continue;                      // 원문 없음은 열 번째 게이트가 잡는다
            const missing = [...src].filter((u) => !t.urls.has(u));
            if (missing.length && !CTA_DROP_EXEMPT[t.key]) {
              fail.push(
                `${t.slug} (${t.lang}): 원문에 있는 상업 링크가 번역본에 없습니다 ${missing.length}건.\n` +
                missing.map((u) => `      · ${u}`).join('\n') + '\n' +
                '    번역하면서 frontmatter 의 visitKorea 를 빠뜨린 것입니다.\n' +
                '    일부러 뺀 것이라면 content-quality.mjs 의 CTA_DROP_EXEMPT 에\n' +
                `    '${t.key}' 키로 **이유를 적으십시오.**\n` +
                '    번역본이 원문보다 적은 것은 오류 없이 사라집니다 — 그래서 여기서 셉니다.',
              );
            }
          }
        }

        for (const w of warn) logger.warn(w);

        if (fail.length) {
          throw new Error(
            `발행 기준을 통과하지 못한 기사 ${fail.length}건.\n\n` +
            fail.map((f) => `  ✗ ${f}`).join('\n\n') + '\n',
          );
        }

        const exempt = Object.keys(HERO_EXEMPT).length;
        logger.info(
          `발행 기준 통과${exempt ? ` (대표사진 예외 ${exempt}건 — 사유 기재됨)` : ''}` +
          `${warn.length ? `, 경고 ${warn.length}건` : ''}`,
        );
      },
    },
  };
}

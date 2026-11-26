/* 3막 '바다 너머로'(61~90장) 데이터 — 아직 게임에 연결 안 함(3막_진행.json 참고).
   설계: 3막은 별도 진행(S.a3 = { chap, stars, best, first }), 전투엔 cfg.act = 3, cfg.chapter = 막 안 번호(1~30).
   battle.js 는 cfg.act === 3 이면 C = D.ACT3[n-1], 난이도 기준 장 = 60 + n, 숙적 표 NEM_ACT[3] 사용.
   판(theme)은 기존 바다·물가 판 재사용: ferry(나루), hwangcheon(검은 물), frozen(얼음), fortress(요새), burning(불타는 항구).
   tint: 적 색 바꾸기(물 젖은 푸른빛) — battle.js drawSprite 에 filter 로 적용 예정. */
(function () {
  const D = window.JZD || (window.JZD = {});
  const T = 'sea';   /* 바다 좀비 색 필터 키 */
  const A = [
    [61, '다시 연 수군 진영', 'Reopened Naval Base', 'fortress', 'mujang', '검은 나침반이 바다를 가리킨다. 무너진 수군 진영부터 되찾자.', 'The black compass points to sea. First, retake the fallen naval base.'],
    [62, '거북선 조선소', 'Turtle Ship Dockyard', 'ferry', 'bulgasari', '쇠를 먹는 새끼 불가사리들이 거북선을 갉아먹고 있다.', 'Baby iron-eaters are gnawing at the turtle ship.'],
    [63, '첫 출항', 'First Voyage', 'ferry', 'zsamurai', '거북선이 바다로 나간다. 뱃머리에 역병 무사들이 매달린다.', 'The turtle ship sets sail. Plague warriors cling to the bow.'],
    [64, '안개 섬 등대', 'Lighthouse of Fog Isle', 'ferry', 'mudang', '등대 불빛이 배들을 바위로 이끈다. 등대지기가 이상하다.', 'The lighthouse lures ships onto the rocks. The keeper is strange.'],
    [65, '해적 소굴', 'Pirate Den', 'burning', 'zgrand', '역병에 물든 해적들이 섬을 차지했다.', 'Plague pirates have seized the island.'],
    [66, '산호 묘지', 'Coral Graveyard', 'hwangcheon', 'byeomra', '바다 밑 산호 사이로 해골 병사들이 걸어 올라온다.', 'Skeleton soldiers climb up from the coral below.'],
    [67, '소용돌이 해협', 'Whirlpool Strait', 'hwangcheon', 'bdokryong', '소용돌이 위로 유령선이 떠오른다. 수귀 제독: "바다는 죽은 자의 것이다."', 'A ghost ship rises from the whirlpool. Admiral Drowned: "The sea belongs to the dead."'],
    [68, '고래 무덤', 'Whale Graveyard', 'ferry', 'bdukkeobi', '거대한 고래 뼈 사이, 역병이 바다 짐승까지 물들였다.', 'Among giant whale bones, the plague has reached the beasts of the sea.'],
    [69, '표류하는 검은 배', 'Drifting Black Ship', 'burning', 'mujang', '버려진 검은 배에서 낯선 글씨의 항해 일지를 찾았다.', 'A logbook in a strange script is found on an abandoned black ship.'],
    [70, '폭풍의 바다', 'Stormy Sea', 'hwangcheon', 'bdokryong', '번개가 바다를 때린다. 해파리 떼가 빛을 뿜는다.', 'Lightning strikes the sea. Jellyfish swarms glow.'],
    [71, '진주 마을', 'Pearl Village', 'village', 'zqueen2', '물질하던 해녀들이 역병에 물들었다.', 'The village divers have fallen to the plague.'],
    [72, '얼음 바다', 'Frozen Sea', 'frozen', 'zbear', '북쪽으로 밀려난 거북선, 얼음 위에서 싸워야 한다.', 'Blown north, the crew must fight on the ice.'],
    [73, '해룡의 사당', 'Sea Dragon Shrine', 'seowon', 'bheukryong', '바다를 지키던 해룡이 어둠에 붙잡혀 있다. 구해 내자!', 'The guardian sea dragon is held by darkness. Free it!'],
    [74, '유령 함대', 'Ghost Fleet', 'hwangcheon', 'bheukryong', '유령 함대가 거북선을 둘러쌌다. 제독이 직접 칼을 뽑는다.', 'The ghost fleet surrounds the turtle ship. The admiral draws his blade.'],
    [75, '침몰한 도시', 'Sunken City', 'hwangcheon', 'bdukkeobi', '바다 밑에 잠긴 옛 도시. 문어 장군이 성문을 막는다.', 'An old city under the sea. The Octopus General blocks the gate.'],
    [76, '소금 사막 섬', 'Salt Desert Isle', 'snow', 'bdukkeobi', '바닷물이 마른 섬, 소금으로 된 거인이 일어선다.', 'On a dried-up isle, a giant of salt rises.'],
    [77, '거꾸로 선 등대', 'Upside-down Lighthouse', 'ferry', 'mudang', '두 번째 등대. 등대지기가 수귀 제독의 부하였다.', 'A second lighthouse. Its keeper served the Drowned Admiral.'],
    [78, '검은 배 조선소', 'Black Ship Yard', 'burning', 'zgrand', '검은 배를 만드는 섬. 배 밑창에 역병 항아리가 실려 있다.', 'The isle where black ships are built. Plague jars fill the holds.'],
    [79, '노예선', 'Prison Ship', 'fortress', 'zsamurai', '끌려가던 사람들을 풀어 주자. 그중에 이와키가 있다.', 'Free the captives. Iwaki is among them.'],
    [80, '산호 미궁', 'Coral Maze', 'hwangcheon', 'bdokryong', '독 산호가 미로를 만든다. 길을 잃으면 끝이다.', 'Poison coral forms a maze. Lose your way and it is over.'],
    [81, '바다 무당의 섬', 'Sea Shaman Isle', 'seowon', 'mudang', '검은 무녀가 바다에서도 굿을 하고 있다. 무녀는 여럿이었다!', 'A dark shaman holds rites at sea. There were many of them!'],
    [82, '해골 암초', 'Skull Reef', 'hwangcheon', 'byeomra', '제독이 다시 나타났다. "서쪽의 주인께서 기다리신다…"', 'The admiral returns. "The master in the west awaits…"'],
    [83, '해적 왕의 무덤', "Pirate King's Tomb", 'palace', 'king', '옛 해적 왕의 지도. 서쪽 끝에 안개로 덮인 땅이 있다.', "The old pirate king's map shows a fog-covered land in the far west."],
    [84, '안개 장벽', 'Wall of Fog', 'ferry', 'bdukkeobi', '바다 위로 안개가 벽처럼 서 있다. 안개 속에 거인이 있다.', 'Fog stands like a wall. A giant waits inside.'],
    [85, '시체 운반선', 'Ships of the Dead', 'burning', 'mujang', '역병 걸린 사람들을 싣고 가는 배들. 어디로 가는 걸까?', 'Ships carrying the sick. Where are they going?'],
    [86, '검은 항구', 'Black Harbor', 'burning', 'bheukryong', '검은 배들의 모항. 쓰러졌던 흑룡 대장이 되살아나 있다.', 'Home port of the black ships. The Black Dragon Captain has risen again.'],
    [87, '등대 요새', 'Lighthouse Fortress', 'fortress', 'zgrand', '항구를 지키는 대포 요새. 장영실의 화차가 빛을 낸다.', "A cannon fort guards the harbor. Jang Yeong-sil's rocket carts shine."],
    [88, '역병 창고', 'Plague Warehouse', 'burning', 'bulgasari', '창고 가득 쌓인 항아리. 누군가 역병을 만들어 보내고 있었다.', 'Jars stacked to the ceiling. Someone was making the plague and shipping it.'],
    [89, '제독의 기함', "Admiral's Flagship", 'fortress', 'jangsanbeom', '수귀 제독의 기함에 올라탄다. 갑판 위 마지막 길.', "Board the admiral's flagship. The last path across the deck."],
    [90, '깊은 바다의 왕좌', 'Throne of the Deep', 'hwangcheon', 'suguijedok', '바다의 왕좌에서 제독을 쓰러뜨린다. 제독의 지도: "안개의 나라, 역병의 탑."', 'Defeat the admiral on the throne of the deep. His map: "Land of Fog, Tower of Plague."']
  ];
  /* 적 무리: 1막 같은 번호 장의 무리를 재사용(바다 색 필터) — 연결 때 D.CHAPTERS[i].pool 복사 */
  D.ACT3 = A.map((r, i) => ({ n: i + 1, gn: r[0], name: r[1], nameEn: r[2], theme: r[3], boss: r[4], story: r[5], storyEn: r[6], tint: T, nights: i < 10 ? 5 : 6, act: 3 }));
  /* 숙적 수귀 제독: 7 인사, 14·22 난입 후 퇴장, 30 결전(역신 nem 코드 재사용, 이름·색만 바꿈) */
  D.NEM_ACT = Object.assign(D.NEM_ACT || {}, {
    3: { key: 'yeoksin', tint: 'seaBoss', name: '수귀 제독', nameEn: 'Admiral Drowned', ch: { 7: { peek: 1 }, 14: { at: 0.3, k: 1.25 }, 22: { at: 0.15, k: 1.6 } },
      lines: { meet: ['산 자가 내 바다에 들어오다니. 크크크…', 'The living dare enter my sea. Heh heh…'], again: ['또 왔구나, 탈쟁이. 이번엔 바닥까지 끌고 가 주마.', 'Back again, masked one? This time I drag you to the bottom.'], peek: ['바다는 죽은 자의 것이다.', 'The sea belongs to the dead.'], r14: ['…물결이 너를 삼킬 날이 온다.', '…The tide will swallow you yet.'], r22: ['서쪽의 주인께서 기다리신다…', 'The master in the west awaits…'] } },
    2: { key: 'yeoksin', tint: 'dream', name: '몽마', nameEn: 'Lord of Nightmares', ch: { 7: { peek: 1 }, 14: { at: 0.3, k: 1.25 }, 22: { at: 0.15, k: 1.6 } },
      lines: { meet: ['악몽에 온 걸 환영한다, 처용.', 'Welcome to the nightmare, Cheoyong.'], again: ['또 잠들었구나. 이번 꿈은 더 깊다.', 'Asleep again? This dream runs deeper.'], peek: ['꿈은 깨지 않는다.', 'Dreams never end.'], r14: ['꿈은 또 온다, 처용.', 'The dream will return, Cheoyong.'], r22: ['역신도 나도… 그분의 목소리를 들었을 뿐.', 'The Plague God and I… we only heard His voice.'] } }
  });
  /* 장 사이 대화(처음 한 번) — 3막 */
  D.ACT3_DLG = {
    1: [['처용', '검은 나침반이 서쪽을 가리킨다.', 'The black compass points west.'], ['이순신', '배를 띄우자. 바다는 내가 안다.', 'Then we sail. I know the sea.']],
    3: [['이순신', '돛을 올려라! 거북선, 출항!', 'Raise the sails! Turtle ship, away!'], ['도깨비', '바다다! 근데 나 헤엄 못 쳐…', "The sea! …I can't swim, though."]],
    7: [['수귀 제독', '산 자가 내 바다에 들어오다니.', 'The living dare enter my sea.'], ['처용', '역병을 보낸 게 너냐?', 'Did you send the plague?'], ['수귀 제독', '나는 나르기만 할 뿐. 크크크…', 'I only carry it. Heh heh…']],
    13: [['해룡', '고맙다, 탈 쓴 자여. 이제 내 물결이 너희를 돕겠다.', 'Thank you, masked one. My waves will aid you now.']],
    14: [['처용', '제독이 직접 나왔다. 모두 준비해!', 'The admiral himself! Everyone, ready!']],
    19: [['이와키', '…김충선 형님? 나를 구하러 왔소?', '…Brother Kim? You came for me?'], ['김충선', '역병에서 깨어났구나. 이제 함께 가자.', "You've woken from the plague. Come with us."]],
    22: [['수귀 제독', '서쪽의 주인께서 기다리신다…', 'The master in the west awaits…'], ['처용', '서쪽의 주인? 역신 뒤에 또 누가 있는 거지?', 'Master in the west? Who stands behind the Plague God?']],
    23: [['장영실', '해적 왕의 지도다. 서쪽 끝에 안개 덮인 땅이 있어.', "The pirate king's map. A fog-covered land in the far west."]],
    26: [['처용', '흑룡 대장이 되살아났다고? 누가 되살렸지?', 'The Black Dragon Captain lives again? Who raised him?']],
    30: [['수귀 제독', '안개의 나라… 역병의 탑… 그분이 문을 여시리라…', 'Land of Fog… Tower of Plague… He will open the gate…'], ['처용', '역병이 만들어진 곳. 거기서 끝내자.', 'Where the plague was made. We end it there.']]
  };
  /* ---- 게임 연결용(11-27) ---- */
  const EN = !!window.IS_EN;
  D.TINTF = Object.assign(D.TINTF || {}, { sea: 'hue-rotate(75deg) saturate(1.15)', seaBoss: 'hue-rotate(185deg) saturate(1.35) brightness(1.05)', dream: 'hue-rotate(250deg) saturate(1.3) brightness(.92)' });
  if (D.EN && D.EN.yeoksin && !D.EN.suguijedok) D.EN.suguijedok = Object.assign({}, D.EN.yeoksin, { n: EN ? 'Admiral Drowned' : '수귀 제독', spr: 'yeoksin', tf: D.TINTF.seaBoss, hp: Math.round(D.EN.yeoksin.hp * 1.1) });
  /* 1막 뒤쪽 장을 틀로: 무리·정예·밤 수·목표는 그대로, 이름·판·우두머리·색만 3막 것 */
  D.a3Tpl = n => Math.min(30, 16 + Math.floor((n - 1) / 2));   /* 틀: 1막 16~30장(무리가 다양한 뒤쪽 장) */
  D.ACT3C = D.ACT3.map((a, i) => { const t = D.CHAPTERS[D.a3Tpl(i + 1) - 1]; return Object.assign({}, t, { n: a.n, tpl: D.a3Tpl(i + 1), gn: a.gn, name: EN ? a.nameEn : a.name, nameKo: a.name, theme: a.theme, boss: D.EN[a.boss] ? a.boss : t.boss, tint: 'sea', act: 3, story: EN ? a.storyEn : a.story, fresh: [], objective: t.objective === 'survive' ? 'defend' : t.objective });   /* 3막은 매 장 우두머리가 나오게(버티기 목표 제외) */ });
  { const L = D.ACT3C[29]; L.finIn = ['수귀 제독 강림', '깊은 바다의 마지막 밤', 'Admiral Drowned Rises', 'Last night of the deep']; L.finP2 = ['수귀 제독 · 심해의 분노', '바다가 너를 삼킨다, 처용!', 'Admiral Drowned · Wrath of the Deep', 'The sea will swallow you, Cheoyong!']; }
  /* 난이도(11-27 시뮬 맞춤): 악몽 30장 마지막 밤 × 1.45 에서 시작, 30장 동안 1.58배까지 */
  D.a3K = n => ({ hp: 1, rate: 1.55 + 0.006 * (n - 1), dmg: 2.1 + 0.03 * (n - 1) });
  D.a3Nights = function (n) {
    const o = D.nightsOf(D.a3Tpl(n)), ref = D.nightsOf(30), C = D.ACT3C[n - 1];
    const last = a => a[a.length - 1].hp, nm30 = D.nmK ? D.nmK(30).hp : 36;
    const k = last(ref) * nm30 * 1.45 * (1 + 0.02 * (n - 1)) / Math.max(0.01, last(o)) * (D.A3HP && D.A3HP[n] || 1);
    o.forEach(x => { x.dhp = x.hp; x.hp *= k; if (x.boss) x.boss = C.boss; });   /* dhp: 적 피해 기준(배율 전) */
    return o;
  };

  /* 11-27 시뮬 보정(돈 다 쓰는 계정, 장마다 4판 — 표본 적음): 악몽 앞 장 쉬움·가운데 어려움, 3막 16~24장 어려움·끝 쉬움 */
  D.NMHP = Object.assign(D.NMHP || {}); for (let c = 1; c <= 30; c++) D.NMHP[c] = D.NMHP[c] || (c <= 5 ? 1.6 : c <= 10 ? 1.2 : 0.9);
  D.A3HP = Object.assign(D.A3HP || {}); for (let c = 1; c <= 30; c++) D.A3HP[c] = D.A3HP[c] || (c >= 16 && c <= 24 ? 0.75 : c >= 25 ? 1.1 : 1);
  /* 장 사이 대화 → 화면 대화 형식으로 */
  D.ACT3_DLG_UI = n => { const L = D.ACT3_DLG[n]; if (!L) return null; const P = { '처용': ['img/ui/hero_face.webp', 'Cheoyong', '#ffcf6a'], '수귀 제독': ['img/story/op3.webp', 'Admiral Drowned', '#6ad0ff'], '이순신': ['img/ui/hero_yisunsin.webp?v=4', 'Admiral Yi', '#8fd4ff'], '도깨비': ['img/ui/hero_dokkaebi.webp?v=4', 'Dokkaebi', '#8fd4ff'], '김충선': ['img/ui/hero_kimchungseon.webp?v=4', 'Kim Chung-seon', '#8fd4ff'], '장영실': ['img/story/op2.webp', 'Jang Yeong-sil', '#cfe8b0'], '해룡': ['img/story/op2.webp', 'Sea Dragon', '#6ad0ff'], '이와키': ['img/story/op2.webp', 'Iwaki', '#cfe8b0'] };
    return L.map(l => { const p = P[l[0]] || ['img/story/op2.webp', l[0], '#cfe8b0']; return ['x', l[1], l[2], [p[0], EN ? p[1] : l[0], p[2]]]; }); };
})();
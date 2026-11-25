/* K Zombi 언어 층: 게임 코드는 한국어 그대로 두고, 영어일 때 화면에 그려지는 글자만 바꾼다.
   언어 결정: ?lang=en|ko > localStorage('kz_lang') > navigator.language */
(function () {
'use strict';
let L = null;
const q = /[?&]lang=(en|ko)\b/.exec(location.search);
if (q) { L = q[1]; try { localStorage.setItem('kz_lang', L); } catch (e) {} }
if (!L) { try { const s = localStorage.getItem('kz_lang'); if (s === 'en' || s === 'ko') L = s; } catch (e) {} }
if (!L) L = /^ko/i.test(navigator.language || 'ko') ? 'ko' : 'en';
window.JZL = L; window.IS_EN = L === 'en';
window.JZsetLang = function (l) { try { localStorage.setItem('kz_lang', l); } catch (e) {} const u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.toString(); };

/* 언어 바꾸기 작은 단추 (첫 화면 오른쪽 위) */
function langBtn() {
  if (document.getElementById('kzLangBtn')) return;
  const b = document.createElement('button'); b.id = 'kzLangBtn'; b.textContent = L === 'en' ? '한국어' : 'EN';
  b.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;padding:4px 10px;border-radius:12px;border:2px solid #e8c868;background:rgba(20,18,24,.8);color:#ffe08a;font:900 13px sans-serif;cursor:pointer';
  b.addEventListener('click', ev => { ev.stopPropagation(); window.JZsetLang(L === 'en' ? 'ko' : 'en'); });
  document.body.appendChild(b);
  /* 첫 화면에서만 보이게 */
  const upd = () => { const t = document.getElementById('s-title'); const inBattle = window.JZB && window.JZB.G; b.style.display = (!inBattle && (!t || t.classList.contains('on'))) ? '' : 'none'; };
  setInterval(upd, 500); upd();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', langBtn); else langBtn();

if (L !== 'en') return;
document.documentElement.lang = 'en';

const DICT = {
'사당이 위험하다!': 'The shrine is in danger!', '짝 완성!': 'Pair complete!', '진화 짝 ·': 'Evolution pair ·', '기습!': 'Ambush!', '기절': 'Stun', '구출!': 'Rescued!', '피난민': 'Refugees', '봉화대': 'Beacon tower', '영웅 결속': 'Hero Bond', '진동 켬': 'Vibration on', '진동 끔': 'Vibration off', '달성!': 'Complete!', '실패': 'Failed', '목표 ·': 'Goal ·', '사당 지키기': 'Defend the shrine', '시간 버티기': 'Survive', '피난민 호위': 'Escort refugees', '우두머리 속전': 'Boss rush', '봉화대 지키기': 'Defend the beacon', '섬멸': 'Annihilate',
'의상': 'Outfits', '모습만 바뀌어요': 'cosmetic only', '모습만 바뀌고 능력치는 같아요': 'Changes your look only; stats stay the same', '기본 처용': 'Classic Cheoyong', '흰 도포에 갓을 쓴 처용': 'Cheoyong in a white robe and gat', '암행어사': 'Secret Royal Inspector', '낡은 도포에 마패를 찬 비밀 어사': 'A secret inspector in a worn robe with a royal horse tally', '저승사자': 'Grim Reaper', '검은 도포와 흑립, 이름 적힌 두루마리': 'Black robe, black gat and a scroll of names', '장수복': 'General Armor', '붉은 두정갑과 투구를 갖춘 조선 장수': 'A Joseon general in red studded armor and helmet', '곤룡포': 'Royal Dragon Robe', '금빛 용무늬 붉은 곤룡포와 익선관': 'Red royal robe with golden dragons and a winged royal hat', '착용 중': 'Wearing', '착용': 'Wear', '의상을 바꿨어요': 'Outfit changed', '옥이 모자라요': 'Not enough jade',
/* 이름: 영웅·신수 */
'처용': 'Cheoyong', '이순신': 'Yi Sun-sin', '을지문덕': 'Eulji Mundeok', '강감찬': 'Gang Gam-chan', '원효대사': 'Wonhyo', '홍길동': 'Hong Gil-dong',
'구미호': 'Gumiho', '바리공주': 'Princess Bari', '전우치': 'Jeon Woo-chi', '사명대사': 'Samyeong', '대장금': 'Dae Jang-geum', '화랑 사다함': 'Hwarang Sadaham',
'김충선': 'Kim Chung-seon', '이무기': 'Imugi', '도깨비': 'Dokkaebi', '해태': 'Haetae', '삼족오': 'Samjogo',
'청룡': 'Azure Dragon', '백호': 'White Tiger', '주작': 'Vermilion Bird', '현무': 'Black Tortoise', '사방신을 깨운다': 'Awaken the Four Guardians',
'사당': 'Shrine', '엽전': 'coins', '망루': 'Watchtower', '병영': 'Barracks', '성벽': 'Wall', '성문': 'Gate', '천하대장군': 'Great General Totem', '지하여장군': 'Lady General Totem',
'좀비': 'zombie', '본부': 'HQ', '옥': 'Jade', '신력': 'Spirit', '신력석': 'Spirit Stone', '횃불': 'Torch', '조각': 'Shards', '도면': 'Blueprints',
/* 전투 */
'번째 밤': 'Night', '우두머리 토벌': 'Defeat the boss', '적': 'enemies', '마리 물리치기': 'defeated', '사당 내구도 절반 넘게 지키기': 'Keep the Shrine above half HP',
'신력 기술 하나 각성하기': 'Awaken one Spirit skill', '처형': 'Execute', '회피': 'Dodge', '흑립의 가호! 잠시 무적': 'Black Gat ward! Briefly invincible',
'사당이 공격받고 있어!': 'The Shrine is under attack!', '격파!': 'Destroyed!', '비틀이': 'Staggerer', '질주 좀비': 'Sprinter zombie', '절뚝이': 'Limper',
'기어오는 좀비': 'Crawler zombie', '팔 부러진 좀비': 'Broken-arm zombie', '외다리 좀비': 'One-leg zombie', '물구나무 좀비': 'Handstand zombie', '뒷걸음 좀비': 'Backwalker zombie',
'우두머리 출현!': 'Boss incoming!', '정예 출현!': 'Elite incoming!', '진지 구축': 'Fortify', '하나를 골라 공짜로 짓거나 올립니다': 'Pick one to build or upgrade for free',
'레벨': 'Lv.', '이미 세운': 'Upgrade your', '을 강화한다 (위력 +40%)': '(power +40%)', '사당 내구도와 밤 보상이 오르고 시설을 더 높이 올릴 수 있다': 'Raises Shrine HP and night rewards, and unlocks higher building levels',
'· 둘째 동료 합류': '· 2nd hero joins', '레벨 성벽': 'Wall', '성벽과 성문을 강화한다': 'Reinforce walls and gate', '성벽과 성문을 세워 지상 좀비를 막는다': 'Build walls and a gate to stop ground zombies',
'공짜': 'Free', '레벨!': 'Lv. up!', '합류!': 'joins!', '조총수': 'Musketeer', '연노병': 'Repeating crossbowman', '궁수': 'Archer', '명이 쏜다': 'shooting',
'병사 최대': 'Max soldiers', '명 ·': '·', '밤마다 엽전 +': 'Coins per night +', '주변 회복': 'Heals nearby', '/초': '/s', '광선 피해': 'Beam dmg', '· 사거리': '· Range',
'· 짝 효과: 피해 +40%, 옆 적에게 튐': '· Pair bonus: dmg +40%, chains to a nearby enemy', '· 지하여장군과 짝이면 더 강해짐': '· Stronger when paired with the Lady General',
'느려짐 50% · 초당 피해': 'Slow 50% · DPS', '· 짝 효과: 범위 +30%': '· Pair bonus: area +30%', '· 천하대장군과 짝이면 범위 확대': '· Wider area when paired with the Great General',
'피해': 'Dmg', '초당 피해': 'DPS', '성벽 (없음)': 'Wall (none)', '지상 좀비가 성벽부터 부숴야 들어온다. 성문 포함': 'Ground zombies must break the wall to get in. Includes the gate.',
'레벨: 성벽 체력': ': wall HP', '최고 레벨': 'Max level', '강화': 'Upgrade', '건설': 'Build', '레벨 사당(본부)': 'Shrine (HQ)', '시설 최대': 'Buildings up to Lv.',
'레벨 · 동료': '· Heroes', '명': '', '다음: 시설': 'Next: buildings up to Lv.', '레벨까지': '', ', 동료 +1': ', +1 hero', ', 밤마다 엽전 +': ', coins per night +',
'다음': 'Next', '레벨:': ':', '(사당 레벨 필요)': '(needs higher Shrine)', '사당 레벨 필요': 'needs higher Shrine', '거두기': 'Remove', '· 우두머리의 밤': '· Boss night',
'진화!': 'evolved!', '신력이 차올랐다!': 'Spirit is full!', '하나를 고르십시오': 'Choose one', '다시 뽑기': 'Reroll', '새 기술': 'New skill', '진화': 'Evolve',
'각성:': 'Awaken:', '진화:': 'Evolve:', '연계 ·': 'Combo ·', '(위력 +20%, 동료 피해 +15%)': '(power +20%, hero dmg +15%)', '최대 ·': 'Max ·', '와 짝이면 진화': 'evolves with',
'처용 진노': "Cheoyong's Wrath", '어의의 탕약!': "Royal Physician's Brew!", '노릴 원거리·마법 적이 없다': 'No ranged or magic enemies to target', '동이 튼다': 'Dawn breaks',
'보상 엽전 +': 'Reward coins +', '+30 엽전': '+30 coins', '검은 무녀의 결계!': "Dark Shaman's barrier!", '어명이오! 장승과 신수가 묶였다': 'Royal decree! Totems and guardians are bound',
'성벽이 버티지 못해!': 'The wall is failing!', '시설이 무너졌다': 'A building fell', '레벨 성벽 완성!': 'Wall built!', '성문이 부서졌다!': 'The gate is broken!',
'성벽이 무너졌다!': 'The wall collapsed!', '승리!': 'Victory!', '사당이 무너졌다': 'The Shrine has fallen', '처용이 쓰러졌다': 'Cheoyong has fallen', '수호 성공': 'defended',
'을 넘기지 못했다': 'was not survived', '패배': 'Defeat', '물리친 적': 'Enemies defeated', '동료': 'Heroes', '건물': 'Buildings', '자': 'Me', '폭': 'Bomb', '약': 'Heal', '전': 'Hero',
'준비': 'Prepare', '극한 도전': 'Extreme challenge', '무한 방어선': 'Endless defense', '엽전 던전': 'Coin dungeon', '경험치 던전': 'XP dungeon', '본부 2': 'HQ 2', '자동': 'Auto',
'원활 모드 켬': 'Smooth mode on', '원활 모드': 'Smooth mode', '돌판으로 걸어가 시설을 세우세요': 'Walk to a stone pad to build', '소리 켬': 'Sound on', '소리 끔': 'Sound off',
/* 적 */
'역병 백성': 'Plague villager', '좀비 궁수': 'Zombie archer', '좀비 군졸': 'Zombie soldier', '좀비 기마병': 'Zombie cavalry', '좀비 기마궁수': 'Zombie horse archer',
'좀비 양반': 'Zombie noble', '좀비 문신': 'Zombie official', '좀비 들개': 'Zombie dog', '역병 쥐': 'Plague rat', '좀비 까마귀': 'Zombie crow', '좀비 멧돼지': 'Zombie boar',
'좀비 황소': 'Zombie ox', '좀비 반달곰': 'Zombie bear', '좀비 범': 'Zombie tiger', '좀비 검사': 'Zombie swordsman', '좀비 왜군': 'Zombie raider', '좀비 사무라이': 'Zombie samurai',
'좀비 승려': 'Zombie monk', '좀비 대장군': 'Zombie grand general', '좀비 왕비': 'Zombie queen', '역신': 'Plague God', '검은 무녀': 'Dark Shaman', '좀비 무장': 'Zombie general', '역병 든 임금': 'Plague King',
/* 챕터 */
'역병 도는 마을': 'Plague Village', '버려진 장터': 'Abandoned Market', '눈 덮인 고개': 'Snowy Pass', '불타는 관아': 'Burning Magistracy', '안개 낀 나루': 'Misty Ferry',
'무너진 산성': 'Ruined Fortress', '귀신 나는 서원': 'Haunted Academy', '얼어붙은 궁궐 뒤뜰': 'Frozen Palace Garden', '황천 다리': 'Bridge of the Underworld',
'역병 든 궁궐': 'Plague Palace', '피어린 성곽길': 'Bloody Rampart Road', '역병 돈 포구': 'Plague Harbor', '버려진 광산': 'Abandoned Mine', '귀신 우는 대숲': 'Wailing Bamboo Forest',
'얼음 동굴': 'Ice Cave', '무너진 탑골': 'Fallen Pagoda Valley', '핏빛 단풍 산사': 'Crimson Maple Temple', '저주받은 왕릉': 'Cursed Royal Tomb', '불타는 한양 저잣거리': 'Burning Hanyang Streets',
'역병 군영': 'Plague Camp', '안개 덮인 섬': 'Fog Island', '검은 늪': 'Black Swamp', '쟿빛 고개': 'Ashen Pass', '잿빛 고개': 'Ashen Pass', '저승 문턱': "Death's Threshold", '해골 성채': 'Skull Citadel',
'얼어붙은 백두': 'Frozen Baekdu', '독기 서린 궁궐 지하': 'Toxic Palace Vaults', '하늘 다리': 'Sky Bridge', '어둠의 종묘': 'Dark Royal Shrine', '역신의 옥좌': "Plague God's Throne",
/* 시설 */
'눈에서 붉은 광선을 쏜다': 'Fires red beams from its eyes', '푸른 기운으로 적을 느리게 한다': 'Slows enemies with a blue aura', '탑 위 병사가 쏜다 (궁수 → 연노병 → 조총수로 강화, 단계마다 인원 증가)': 'Soldiers shoot from the tower (Archer → Crossbow → Musket, more each level)',
'금광': 'Gold Mine', '밤을 넘길 때마다 엽전 +20': '+20 coins every night survived', '화덕탑': 'Fire Tower', '가까이 온 적에게 불길을 뿜는다': 'Breathes fire at nearby enemies',
'화차': 'Hwacha', '신기전 여덟 발을 한꺼번에': 'Fires eight rocket arrows at once', '화포': 'Cannon', '포탄이 날아가 넓게 터진다': 'Shells burst over a wide area', '부적탑': 'Talisman Tower',
'번개가 적에서 적으로 옮겨 붙는다': 'Lightning jumps from enemy to enemy', '조선 병사가 나와 성문 앞을 지킨다 (강화할수록 병종과 인원 증가)': 'Joseon soldiers guard the gate (more types and troops each level)',
'우물': 'Well', '주변 처용과 시설의 체력을 되살린다': 'Restores HP of Cheoyong and buildings nearby',
'검사': 'Swordsman', '창수': 'Spearman', '극사': 'Halberdier', '조총병': 'Musketeer', '승병': 'Warrior monk', '기마병': 'Cavalry', '도사': 'Taoist',
/* 무기 */
'각궁': 'Horn Bow', '금빛 화살이 적 하나를 뚫고 나간다': 'A golden arrow pierces an enemy', '수노기': 'Repeating Crossbow', '푸른 쇠뇌살을 쉴 새 없이 쏜다': 'Fires blue bolts nonstop',
'조총': 'Musket', '느리지만 세고 멀리 간다. 적 셋을 뚫는다': 'Slow but strong and long-range. Pierces three enemies', '만파식적': 'Manpasikjeok Flute', '피리 소리가 부채꼴 음파로 퍼져 적을 밀어내고 뚫는다': 'Flute sound waves fan out, pushing and piercing enemies',
'칠지도': 'Seven-Branched Sword', '일곱 갈래 검기를 한꺼번에 날린다': 'Unleashes seven sword waves at once', '승자총통': 'Seungja Gun', '철환 여러 알을 흩뿌린다': 'Sprays iron pellets',
/* 신수 */
'사당 왼편': 'Left of Shrine', '사당 피해 30% 감소. 영혼이 나와 물결 방패로 적을 밀어내고 느리게 한다': 'Shrine takes 30% less damage. Its spirit pushes back and slows enemies with a wave shield',
'사당 오른편': 'Right of Shrine', '영혼이 날아올라 내리꽂으며 불길 자국을 남긴다': 'Its spirit dives down, leaving trails of fire', '성문 앞 왼편': 'Left of Gate',
'영혼이 적 무리로 뛰어들어 세 번 할퀴고 포효로 밀쳐 낸다': 'Its spirit leaps into the horde, claws three times and roars them back', '성문 앞 오른편': 'Right of Gate',
'영혼이 하늘을 휘감으며 번개를 다섯 번 내리친다': 'Its spirit coils through the sky and strikes lightning five times',
/* 영웅 */
'원거리': 'Ranged', '화살 다섯 대를 부채꼴로 쏜다': 'Fires five arrows in a fan', '학익진': 'Crane Wing Formation', '거북선이 나타나 포탄을 퍼붓는다': 'A Turtle Ship appears and bombards',
'근거리': 'Melee', '적에게 뛰어들어 회전 베기': 'Leaps in with a spinning slash', '살수대첩': 'Battle of Salsu', '거대한 물결이 적을 쓸어 간다': 'A huge wave sweeps enemies away',
'법사': 'Mage', '염주에서 금빛 광선을 쏜다': 'Fires golden beams from prayer beads', '정화 결계': 'Purifying Barrier', '큰 결계로 적을 태우고 아군을 치유': 'A big barrier burns enemies and heals allies',
'번개': 'Lightning', '벼락이 적에서 적으로 옮겨 붙는다': 'Lightning jumps from enemy to enemy', '귀주대첩': 'Battle of Gwiju', '화면 모든 적에게 벼락': 'Lightning on every enemy on screen',
'날쌘 공격': 'Swift strike', '분신 둘이 함께 비수를 던진다': 'Two clones throw daggers with him', '둔갑 연속베기': 'Shapeshift Slashes', '순간이동하며 적 열둘을 벤다': 'Teleports and slashes twelve enemies',
'마법': 'Magic', '여우불 셋이 적을 쫓아간다': 'Three fox fires chase enemies', '홀림': 'Bewitch', '적 여덟을 홀려 서로 싸우게 한다': 'Charms eight enemies into fighting each other',
'혼령술': 'Spiritcraft', '쓰러진 좀비의 혼을 인도해 잠시 아군 혼령으로 싸우게 한다': 'Guides fallen zombie souls to fight briefly as ally spirits', '저승길 인도': 'Path to the Afterlife',
'화면 안 적에게 피해를 주고 쓰러진 적을 혼령 아군으로 일으킨다': 'Damages enemies on screen and raises the fallen as spirit allies', '도술 검객': 'Sorcerer swordsman',
'칼을 휘둘러 적을 꿰뚫는 검기를 날린다': 'Swings his sword to send piercing sword waves', '화중병': 'Painted Soldiers', '그림 속 먹물 병사 여섯을 불러내 함께 싸운다': 'Summons six ink soldiers from a painting',
'권법': 'Martial arts', '권법 연타로 적을 기절시킨다': 'Stuns enemies with rapid punches', '승병 봉기': 'Monk Uprising', '승병 다섯을 불러 앞을 막는다': 'Calls five warrior monks to block the way',
'치유': 'Healer', '약재 주머니를 던지고 주변 처용과 동료를 치유한다': 'Throws herb pouches and heals Cheoyong and heroes nearby', '어의의 탕약': "Royal Physician's Brew",
'사당과 처용, 시설을 크게 회복하고 잠시 받는 피해를 줄인다': 'Greatly heals the Shrine, Cheoyong and buildings, and briefly reduces damage taken',
'적 사이를 오가며 세 번 연달아 벤다': 'Dashes between enemies, slashing three times', '화랑 검무': 'Hwarang Sword Dance', '일직선으로 돌진하며 앞의 적을 모두 벤다': 'Charges in a line, cutting down everything ahead',
'암살': 'Assassin', '귀화한 사무라이. 적진의 원거리·마법 유닛만 노려 뒤로 파고들어 벤다': 'A naturalized samurai. Slips behind enemy lines to cut down ranged and magic units',
'귀순의 칼': 'Blade of Allegiance', '화면 안 원거리·마법 적을 차례로 순간이동하며 모두 벤다': 'Teleports to every ranged and magic enemy on screen and cuts them down',
'비행': 'Flying', '하늘을 날며 불길을 뿜는다': 'Flies and breathes fire', '승천': 'Ascension', '하늘로 솟구치며 불덩이 비를 쏟는다': 'Soars up and rains fireballs',
'도깨비방망이를 던져 되돌아오게 한다': 'Throws a goblin club that boomerangs back', '방망이 지진': 'Club Quake', '땅을 세 번 내리쳐 적을 기절시킨다': 'Pounds the ground three times to stun enemies',
'수호': 'Guardian', '불길을 내뿜어 앞의 적을 태운다': 'Breathes fire to burn enemies ahead', '해치의 불바다': "Haechi's Sea of Fire", '앞쪽 땅을 불바다로 만든다': 'Turns the ground ahead into a sea of fire',
'태양 광선으로 여러 적을 꿰뚫는다': 'Pierces many enemies with sunbeams', '태양 강림': 'Descent of the Sun', '하늘에서 태양 광선이 쏟아진다': 'Sunbeams pour from the sky',
'불': 'Fire', '얼음': 'Ice', '기': 'Qi', '쇠': 'Metal', '해': 'Sun',
/* 신력 기술 */
'백귀야행': 'Night Parade of Ghosts', '천벌 유성우': 'Meteor Judgment', '뇌신강림': 'Thunder God Descends', '빙룡': 'Ice Dragon', '처용 대무': 'Great Cheoyong Dance',
'팔괘 부적진': 'Eight Trigram Talismans', '해모수 광선': 'Haemosu Beam', '화룡 회오리': 'Fire Dragon Whirl',
'진화: 귀신불이 맞으면 작게 터진다, 발수 +3': 'Evolve: ghost fire bursts on hit, +3 shots', '진화: 불바다가 두 배로 넓고 오래 탄다': 'Evolve: fire field twice as wide and long',
'진화: 벼락이 주변 적 셋에게 옮겨 붙는다': 'Evolve: lightning jumps to three nearby enemies', '진화: 맞은 적이 반드시 얼어붙는다': 'Evolve: hit enemies always freeze',
'진화: 부채가 커지고 불꽃 자국을 남긴다': 'Evolve: bigger fans that leave flame trails', '진화: 부적이 두 번 터진다': 'Evolve: talismans explode twice',
'진화: 광선이 굵어지고 맞은 적이 불탄다': 'Evolve: thicker beam that burns', '진화: 불회오리가 둘로 나뉜다': 'Evolve: the firestorm splits in two',
'귀화탄': 'Ghost Fire', '보랏빛 귀신불': 'purple ghost fires', '발이 적을 쫓아간다': 'chase enemies', '별똥불': 'Meteor Fire', '불타는 운석': 'burning meteors', '개가 떨어져 불바다를 남긴다': 'fall and leave fire fields',
'벼락': 'Thunderbolt', '하늘에서 벼락': 'lightning bolts', '줄기가 내리꽂힌다': 'strike from the sky', '얼음송곳': 'Ice Spikes', '개를 부채꼴로 쏘아 얼린다': 'fired in a fan to freeze',
'처용무': 'Cheoyong Dance', '부채': 'fans', '개가 처용 둘레를 돌며 벤다': 'circle Cheoyong and slash', '벽사부': 'Warding Talisman', '부적': 'talismans', '장이 날아가 터진다': 'fly out and explode',
'신궁 광선': 'Divine Bow Beam', '붉은 광선이 이어지며': 'A red beam chains through', '명을 꿰뚫는다': 'enemies', '불회오리': 'Firestorm', '불회오리가 적을 빨아들이며 태운다 (위력': 'A firestorm pulls in and burns enemies (power',
'속사': 'Rapid Fire', '쏘는 간격이 15% 짧아진다': 'Fire interval -15%', '겹발': 'Multishot', '한 번에 쏘는 발수가 하나 늘어난다': '+1 shot per volley', '관통': 'Pierce', '적 하나를 더 뚫는다': 'Pierces one more enemy',
'모든 공격 위력이 20% 오른다': 'All attack power +20%', '급소': 'Vital Strike', '치명타 확률 +8% (치명타는 두 배)': 'Crit chance +8% (crits deal double)', '축지': 'Swift Step', '이동이 15% 빨라진다': 'Move speed +15%',
'옥구슬 끌기': 'Bead Magnet', '옥구슬을 끌어오는 거리 +60%': 'Jade bead pickup range +60%', '정화수': 'Pure Water', '체력 40 회복, 최대 체력 +20': 'Heal 40 HP, max HP +20',
'사당 보수': 'Shrine Repair', '사당 내구도를 100 되살린다': 'Restore 100 Shrine HP', '장승 가호': 'Totem Blessing', '세운 시설의 위력과 속도 +25%': 'Buildings power and speed +25%',
/* 장비 */
'무기': 'Weapon', '모자': 'Hat', '옷': 'Robe', '토시': 'Bracers', '신': 'Shoes', '노리개': 'Charm',
'일반': 'Common', '우수': 'Uncommon', '희귀': 'Rare', '영웅': 'Hero', '전설': 'Legendary', '신화': 'Mythic', '고급': 'Fine',
'쇠뿔로 만든 활. 금빛 화살이 적을 뚫는다': 'A bow of ox horn. Golden arrows pierce enemies', '화살 관통 +1': 'Arrow pierce +1', '다섯 발마다 불화살이 터진다': 'Every fifth shot is an exploding fire arrow',
'화살이 세 갈래로 나간다': 'Arrows split three ways', '연달아 쏘는 쇠뇌': 'A rapid-fire crossbow', '쏘는 속도 +15%': 'Attack speed +15%', '맞은 적이 느려진다': 'Hit enemies are slowed',
'쇠뇌살이 두 번 튕긴다': 'Bolts bounce twice', '느리지만 세고 멀리 가는 총': 'A slow but strong long-range gun', '치명타 확률 +10%': 'Crit chance +10%', '처치한 적이 폭발한다': 'Slain enemies explode',
'총알이 모든 적을 뚫는다': 'Bullets pierce all enemies', '철환을 흩뿌리는 총통': 'A gun that sprays iron pellets', '철환 +2알': '+2 pellets', '가까운 적을 크게 밀쳐 낸다': 'Knocks nearby enemies far back',
'철환에 불이 붙는다': 'Pellets catch fire', '흑립': 'Black Gat', '선비의 검은 갓': "A scholar's black gat", '받는 피해 -10%': 'Damage taken -10%',
'체력 30% 아래로 떨어지면 2초 무적(한 판 한 번)': 'Below 30% HP, 2s invincibility (once per battle)', '5초마다 체력 3% 회복': 'Heal 3% HP every 5s', '전립': 'Jeollip Hat',
'무관이 쓰던 붉은 술 모자': "A military officer's tasseled hat", '치명타 확률 +5%': 'Crit chance +5%', '치명타 피해 +30%': 'Crit damage +30%', '큰 기술 대기 -20%': 'Ultimate cooldown -20%',
'봉시투구': 'Iron Helm', '쇠로 만든 장수의 투구': "A general's iron helmet", '가까이서 때린 적에게 피해를 돌려준다': 'Reflects damage to melee attackers', '사당 내구도 +20%': 'Shrine HP +20%',
'도포': 'Dopo Robe', '넓은 소매의 흰 도포': 'A white wide-sleeved robe', '옥구슬 경험치 +15%': 'Jade bead XP +15%', '옥구슬 끄는 거리 +50%': 'Jade bead pickup range +50%', '카드 다시 뽑기 +1': 'Card reroll +1',
'철릭': 'Cheollik', '무관의 군복': "An officer's uniform", '사당 내구도 +15%': 'Shrine HP +15%', '시설 위력 +20%': 'Building power +20%', '시작 엽전 +60': 'Starting coins +60',
'두정갑': 'Studded Armor', '쇠못을 박은 갑옷': 'Armor studded with iron nails', '밤마다 체력 25% 보호막': 'Shield of 25% HP each night', '비단 토시': 'Silk Bracers', '가벼운 비단 토시': 'Light silk bracers',
'쏘는 속도 +10%': 'Attack speed +10%', '신력 기술 대기 -10%': 'Spirit skill cooldown -10%', '한 번에 쏘는 발수 +1': '+1 shot per volley', '가죽 깍지': 'Leather Thumb Ring', '활 쏘는 손을 지키는 깍지': "An archer's thumb ring",
'정예·우두머리에게 피해 +25%': 'Damage vs elites and bosses +25%', '체력 10% 아래 일반 적은 바로 쓰러진다': 'Normal enemies below 10% HP die instantly', '미투리': 'Hemp Sandals', '삼으로 엮은 가벼운 신': 'Light woven hemp sandals',
'이동 속도 +10%': 'Move speed +10%', '10% 확률로 피해를 피한다': '10% chance to dodge', '목화': 'Official Boots', '관리의 검은 목화신': "An official's black boots", '움직이는 동안 받는 피해 -20%': 'Damage taken while moving -20%',
'옥노리개': 'Jade Charm', '푸른 옥을 단 노리개': 'A charm with blue jade', '각성까지 필요한 별 -1': '-1 star needed to awaken', '범 발톱 노리개': 'Tiger Claw Charm', '나쁜 기운을 막는 범 발톱': 'A tiger claw against evil',
'적 50마리마다 체력 10% 회복': 'Heal 10% HP every 50 kills', '삼작노리개': 'Triple Charm', '세 갈래 술이 달린 노리개': 'A charm with three tassels', '엽전 줍는 양 +30%': 'Coin pickup +30%', '동료 피해 +30%': 'Hero damage +30%',
'자석 부적': 'Magnet Talisman', '떨어진 옥구슬을 모두 끌어온다': 'Pulls in all dropped jade beads', '벼락 폭탄': 'Thunder Bomb', '화면 안 적 모두에게 큰 피해': 'Heavy damage to all enemies on screen',
'약과': 'Yakgwa', '체력 30% 회복': 'Heal 30% HP', '엽전 꾸러미': 'Coin Pouch', '엽전 +30': 'Coins +30', '챕터': 'Chapter',
'나무 활': 'Wooden Bow', '흑각궁': 'Black Horn Bow', '용각궁': 'Dragon Horn Bow', '천궁': 'Heaven Bow', '신궁': 'Divine Bow', '갓': 'Gat', '삿갓': 'Straw Hat', '옥로립': 'Jade Gat', '주립': 'Red Gat',
'금관립': 'Gold Crown Gat', '신령 갓': 'Spirit Gat', '무명 도포': 'Cotton Robe', '비단 도포': 'Silk Robe', '청 도포': 'Blue Robe', '자색 도포': 'Purple Robe', '금실 도포': 'Gold Thread Robe', '신선 도포': 'Immortal Robe',
'가죽 토시': 'Leather Bracers', '쇠 토시': 'Iron Bracers', '은 토시': 'Silver Bracers', '자개 토시': 'Pearl Bracers', '금 토시': 'Gold Bracers', '용 토시': 'Dragon Bracers',
'짚신': 'Straw Shoes', '가죽신': 'Leather Shoes', '태사혜': 'Taesa Shoes', '운혜': 'Cloud Slippers', '구름신': 'Cloud Shoes',
'매듭 노리개': 'Knot Charm', '호박 노리개': 'Amber Charm', '산호 노리개': 'Coral Charm', '비취 노리개': 'Jadeite Charm', '금 노리개': 'Gold Charm', '삼작 신물': 'Triple Relic',
/* 영웅 소개 */
'암살 · 왜검': 'Assassin · Katana',
'임진왜란 때 조선에 귀화한 사무라이 사야가예요. 적진의 원거리·마법 좀비만 노려 뒤로 순간이동해 베어요. 큰 기술 귀순의 칼은 화면 안 원거리·마법 적을 차례로 벱니다.': 'Sayaka, a samurai who joined Joseon during the Imjin War. He teleports behind ranged and magic zombies to cut them down. Ultimate, Blade of Allegiance, slays every ranged and magic enemy on screen in turn.',
'치유 · 약선': 'Healer · Herbal', '회복': 'Recovery',
'조선 최초의 어의녀예요. 약재 주머니를 던지며 처용과 동료를 치유해요. 큰 기술 어의의 탕약은 사당과 시설을 크게 회복하고 받는 피해를 줄여요.': "Joseon's first female royal physician. She throws herb pouches to heal Cheoyong and heroes. Ultimate, Royal Physician's Brew, greatly heals the Shrine and buildings and reduces damage taken.",
'도술 · 검기': 'Sorcery · Sword wave', '도술을 부리는 검객이에요. 칼을 휘둘러 적을 꿰뚫는 검기를 날려요. 큰 기술 화중병은 그림 속 먹물 병사 여섯을 불러내요.': 'A sorcerer swordsman. His sword sends out piercing sword waves. Ultimate, Painted Soldiers, summons six ink soldiers from a painting.',
'혼령 소환': 'Spirit summoning', '저승길을 안내하는 무조신이에요. 곁에서 쓰러진 좀비의 혼을 인도해 잠시 아군 혼령으로 싸우게 해요.': 'The shaman goddess who guides souls to the afterlife. She leads fallen zombie souls to fight briefly as ally spirits.',
'비행 · 불': 'Flying · Fire', '비행 화염': 'Flying flame', '승천을 꿈꾸는 비룡이에요. 하늘을 날며 불길을 뿜어요. 큰 기술 승천은 날아오르며 불덩이 비를 쏟아요.': 'A young dragon dreaming of ascension. It flies and breathes fire. Ultimate, Ascension, soars up and rains fireballs.',
'근거리 · 검무': 'Melee · Sword dance', '열다섯에 대가야를 친 신라 화랑이에요. 적 사이를 오가며 세 번 연달아 베어요.': 'A Silla Hwarang who fought Daegaya at fifteen. He dashes between enemies, slashing three times.',
'권법 · 승병': 'Martial arts · Monk', '임진왜란의 승병장이에요. 권법 연타로 적을 기절시키고, 큰 기술로 승병을 불러 앞을 막아요.': 'A warrior-monk leader of the Imjin War. Stuns with rapid punches, and his ultimate calls monks to hold the line.',
'원거리 · 활': 'Ranged · Bow', '멀리서 화살을 쏟아부어요. 큰 기술 학익진은 학의 날개처럼 펼친 화살비로 적 무리를 덮어요.': 'Pours arrows from afar. Ultimate, Crane Wing Formation, covers the horde in a wing-shaped arrow storm.',
'칼끝에서 번개를 내리쳐요. 큰 기술 귀주대첩은 넓은 땅에 벼락을 연달아 떨어뜨려요.': 'Calls lightning from his blade. Ultimate, Battle of Gwiju, drops bolt after bolt over a wide area.',
'원거리 화력': 'Ranged firepower', '태양 광선으로 여러 적을 한꺼번에 꿰뚫어요. 큰 기술은 태양 강림이에요.': 'Pierces many enemies at once with sunbeams. Ultimate: Descent of the Sun.',
'근거리 · 검': 'Melee · Sword', '앞장서서 검으로 적을 베어요. 큰 기술 살수대첩은 거센 물살로 적을 쓸어 버려요.': 'Leads the charge with his sword. Ultimate, Battle of Salsu, sweeps enemies away with a torrent.',
'법사 · 염주': 'Mage · Prayer beads', '염주에서 빛줄기를 쏘아요. 큰 기술 정화 결계는 둘레의 역병을 씻어 내고 아군을 지켜요.': 'Shoots beams of light from prayer beads. Ultimate, Purifying Barrier, cleanses the plague around him and protects allies.',
'여우불': 'Fox fire', '유도탄': 'Homing', '여우불이 적을 쫓아가 터져요. 큰 기술 홀림은 적들을 잠시 멍하게 만들어요.': 'Fox fires chase and burst on enemies. Ultimate, Bewitch, dazes enemies for a while.',
'분신': 'Clones', '분신을 만들어 함께 싸워요. 큰 기술 둔갑 연속베기는 순식간에 여러 적을 베어요.': 'Fights alongside his clones. Ultimate, Shapeshift Slashes, cuts down many enemies in an instant.',
'화염 방어': 'Flame defense', '불길을 내뿜어 앞의 적을 태워요. 큰 기술은 해치의 불바다예요.': "Breathes fire on enemies ahead. Ultimate: Haechi's Sea of Fire.",
'도깨비불': 'Goblin fire', '돌격': 'Charge', '도깨비방망이를 던지면 적을 뚫고 되돌아와요. 큰 기술은 방망이 지진이에요.': 'His thrown club pierces enemies and comes back. Ultimate: Club Quake.',
'보랏빛 귀신불이 적을 쫓아가요.': 'Purple ghost fires chase enemies.', '불타는 운석이 떨어져 불바다를 남겨요.': 'Burning meteors fall and leave fire fields.', '하늘에서 벼락이 내리꽂혀요.': 'Lightning strikes from the sky.',
'얼음송곳을 부채꼴로 쏘아 얼려요.': 'Fires ice spikes in a fan to freeze.', '부채가 처용 둘레를 돌며 베어요.': 'Fans circle Cheoyong and slash.', '부적이 날아가 터져요.': 'Talismans fly out and explode.',
'붉은 광선이 이어지며 적을 꿰뚫어요.': 'A red beam chains through enemies.', '불회오리가 적을 빨아들이며 태워요.': 'A firestorm pulls in and burns enemies.',
'처용 세트': 'Cheoyong Set', '공격력 +8%': 'Attack +8%', '처용 진노 대기 -20%': "Cheoyong's Wrath cooldown -20%", '처용무로 시작': 'Start with Cheoyong Dance', '무관 세트': 'Officer Set', '체력 +10%': 'HP +10%',
'병영 병사 +2': 'Barracks soldiers +2', '선비 세트': 'Scholar Set', '경험치 +10%': 'XP +10%', '공격 기술 하나로 시작': 'Start with one attack skill',
'피리 소리가 부채꼴 음파로 퍼져 적을 밀어내고 뚫어요.': 'Flute sound waves fan out, pushing and piercing enemies.', '일곱 갈래 검기를 한꺼번에 날려요.': 'Unleashes seven sword waves at once.',
'천부인': 'Heavenly Seals', '모든 능력치가 크게 오르는 하늘의 신물이에요.': 'A heavenly relic that greatly raises all stats.', '독보': 'Peerless',
/* 로비 */
'챕터 1번 도전하기': 'Play a chapter once', '장비 1번 강화하기': 'Upgrade gear once', '뽑기 1번 하기': 'Summon once', '터치하여 시작': 'Tap to Start', '역병 든 밤, 처용이 마을을 지킨다': 'A night of plague. Cheoyong guards the village.',
'시제품 0.4': 'Prototype 0.4', '가득': 'Full', '상점': 'Shop', '장비': 'Gear', '모험': 'Adventure', '· 밤': '·', '번': '', '지도 ▸': 'Map ▸', '출석': 'Check-in', '임무': 'Quests', '패스': 'Pass', '축제': 'Event',
'랭킹': 'Ranking', '우편': 'Mail', '설정': 'Settings', '업적': 'Achievements', '도감': 'Collection', '친구': 'Friends', '문파': 'Clan', '순찰 보상': 'Patrol Reward', '모험 시작': 'Start Adventure', '시간': 'h', '분': 'm',
'착용': 'Equip', '영웅까지 같은 장비 3개 · 전설·신화는 같은 칸 2개를 먹여 +1~+3 · 도면': 'Up to Epic: 3 identical items · Legendary/Mythic: feed 2 of the same slot for +1~+3 · Blueprints',
'부위': 'pieces', '공격': 'ATK', '체력': 'HP', '일괄 착용': 'Equip best', '일괄 합성': 'Merge all', '가진 장비가 없어요. 상점에서 뽑아 보세요.': 'No gear yet. Try summoning in the Shop.',
'출전': 'Deployed', '함께 싸울 영웅을 2명까지 데려가요': 'Bring up to 2 heroes into battle', '큰 기술 ·': 'Ultimate ·', '· 조각': '· Shards', '출전 빼기': 'Remove', '출전하기': 'Deploy', '레벨업': 'Level up',
'별을 올려야 해요': 'Raise stars first', '별 올리기': 'Star up', '최고': 'Max', '조각 10개를 모으면 함께할 수 있어요. 상점의 영웅 뽑기에서 얻어요.': 'Collect 10 shards to recruit. Get them from Hero Summon in the Shop.',
'맞이하기': 'Recruit', '뽑으러 가기': 'Go summon', '위력': 'Power', '5단계': 'Lv.5', '개 · 별을 올리면 전투 속 기술이 세져요': '· Raise stars to power up skills in battle', '진화 짝 (전투 중)': 'Evolution pair (in battle)',
'무료 엽전': 'Free coins', '엽전 500': '500 coins', '무료': 'Free', '내일 다시': 'Tomorrow', '매일': 'Daily', '엽전 5,000': '5,000 coins', '옥 50': '50 Jade', '신력석 상자': 'Spirit Stone Box', '신력석 20': '20 Spirit Stones',
'옥 80': '80 Jade', '인기': 'Popular', '횃불 묶음': 'Torch Bundle', '횃불 30': '30 Torches', '옥 40': '40 Jade', '옥 주머니': 'Jade Pouch', '옥 300': '300 Jade', '시험용 무료': 'Free (test)', '시제품': 'Prototype',
'옥 상자': 'Jade Chest', '옥 1,000': '1,000 Jade', '옥으로 장비와 동료를 뽑아요': 'Summon gear and heroes with Jade', '장비 뽑기': 'Gear Summon',
'10번 뽑으면 희귀 이상 1개 보장. 전설, 신화 장비가 나올 수 있어요.': '10 pulls guarantee one Rare or better. Legendary and Mythic gear can appear.', '확률 안내': 'Odds', '1번': 'x1', '10번': 'x10', '영웅 뽑기': 'Hero Summon',
'이순신, 강감찬, 삼족오 같은 전설 영웅 조각이 나와요. 조각으로 영웅을 맞이하고 별을 올려요.': 'Get shards of legendary heroes like Yi Sun-sin, Gang Gam-chan and Samjogo. Use shards to recruit heroes and raise stars.',
'물건': 'Items', '옥이 부족해요': 'Not enough Jade', '신력석 5': '5 Spirit Stones', '엽전 800': '800 coins', '확인': 'OK', '한 번 더': 'Again', '장비 뽑기 확률': 'Gear Summon Odds',
'10번 뽑기는 희귀 이상 1개를 꼭 줘요. 칸(무기, 갓, 도포, 토시, 신, 노리개)은 똑같은 확률이에요.': 'A 10-pull always gives one Rare or better. Every slot (weapon, gat, robe, bracers, shoes, charm) has equal odds.',
'영웅 뽑기 확률': 'Hero Summon Odds', '전설 영웅 조각 2개 (이순신, 강감찬, 삼족오)': '2 Legendary hero shards (Yi Sun-sin, Gang Gam-chan, Samjogo)', '영웅 등급 조각 3개 (을지문덕, 원효대사, 구미호)': '3 Epic hero shards (Eulji Mundeok, Wonhyo, Gumiho)',
'희귀 조각 5개 (홍길동, 해태)': '5 Rare shards (Hong Gil-dong, Haetae)', '일반 조각 5개 (도깨비)': '5 Common shards (Dokkaebi)', '신력석 5개': '5 Spirit Stones', '같은 등급 안의 영웅은 똑같은 확률이에요.': 'Heroes of the same grade have equal odds.',
'모험 지도': 'Adventure Map', '밤': 'Night', '번을 버티면 이겨요. 마지막 밤에는 우두머리가 나와요.': 'nights to win. The boss appears on the last night.', '권장 전투력': 'Recommended power', '· 내 전투력': '· My power',
'최고 기록:': 'Best:', '없음': 'None', '도전하기': 'Challenge', '다른 방식으로 도전하기': 'Other modes', '미션 3개 별 3개': '3 missions, 3 stars', '끝없이 버티기': 'Survive endlessly', '엽전 3배': 'Coins x3', '경험치 3배': 'XP x3',
'피해량 기록': 'Damage record', '횃불이 모자라요': 'Not enough Torches', '챕터에 들어가려면 횃불 5개가 필요해요. 횃불은 6분마다 1개씩 차요.': 'Entering a chapter costs 5 Torches. 1 Torch refills every 6 minutes.',
'옥 40으로 30개 채우기': 'Refill 30 for 40 Jade', '전투를 열지 못했어요': "Couldn't open the battle", '시험 전투 중... (챕터': 'Test battle... (Chapter', '완료': 'Done', '실패': 'Failed', '승리': 'Victory',
'· 다음 챕터 열림!': '· Next chapter unlocked!', '물리친 좀비': 'Zombies defeated', '초': 's', '피해 비율': 'Damage share', '전체 피해': 'Total damage', '보상': 'Rewards', '레벨 올라감!': 'Level up!',
'광고 보고 2배': 'Watch ad for x2', '시제품: 광고 없이 바로': 'Prototype: no ad needed', '경험': 'XP', '잠김': 'Locked', '· 레벨': '· Lv.', '공격력 +': 'ATK +', '체력 +': 'HP +', '(착용': '(equipped',
'/6) · 2부위': '/6) · 2 pcs', '· 4부위': '· 4 pcs', '· 6부위': '· 6 pcs', '· 강화에': '· Upgrade uses', '개 (보유': '(own', '지금 착용:': 'Equipped:', '분해': 'Salvage',
'처용 일행이': "Cheoyong's party patrolled the village for", '동안 마을을 돌았어요. (최대 16시간)': '(max 16h).', '챕터를 깰수록 한 시간에 얻는 양이 늘어요.': 'Clear more chapters to earn more per hour.',
'받기': 'Claim', '빠른 순찰': 'Quick Patrol', '횃불 5 · 2시간치': '5 Torches · 2h worth', '7일 출석': '7-Day Check-in', '일': 'Day', '받음': 'Claimed', '일째 받기': 'Claim', '내일 또 와요': 'Come back tomorrow',
'오늘의 임무': "Today's Quests", '새 우편이 없어요.': 'No new mail.', '처용, 조선좀비에 오신 것을 반겨요!': 'Welcome to K Zombi!', '마을을 지켜 줄 처용님께 첫 선물을 보내요.': 'Here is a first gift for Cheoyong, guardian of the village.',
'음악 켬': 'Music on', '음악 끔': 'Music off', '저장은 이 기기에 자동으로 돼요.': 'Progress is saved on this device automatically.', '처음부터 다시': 'Start over',
'시즌 패스': 'Season Pass', '년': '/', '월 시즌 · 전투를 하면 패스 점수가 쌓여요': 'season · Battles earn pass points', '단계 ·': 'Tier ·', '단계': 'Tier', '황금 패스': 'Golden Pass', '황금 패스 사용 중': 'Golden Pass active',
'황금 패스 열기 990원': 'Unlock Golden Pass ₩990', '결제 준비 중': 'Payments coming soon', '좀비 100마리 물리치기': 'Defeat 100 zombies', '좀비 1,000마리 물리치기': 'Defeat 1,000 zombies', '좀비 10,000마리 물리치기': 'Defeat 10,000 zombies',
'첫 승리': 'First victory', '10번 승리': '10 victories', '50번 승리': '50 victories', '챕터 3 열기': 'Unlock Chapter 3', '챕터 5 열기': 'Unlock Chapter 5', '챕터 10 열기': 'Unlock Chapter 10',
'영웅 3명 모으기': 'Collect 3 heroes', '영웅 8명 모으기': 'Collect 8 heroes', '뽑기 10번': '10 summons', '뽑기 50번': '50 summons', '장비 강화 20번': '20 gear upgrades', '진행': 'Progress',
'모은 것': 'Collected', '· 새로 모은 칸을 누르면 옥을 받아요': '· Tap newly collected entries to get Jade', '일째': 'Day', '처용 맞이 축제': 'Cheoyong Welcome Festival',
'이번 달 안에 7일을 들르면 날마다 선물을 받아요. 하루에 한 칸씩!': 'Visit on 7 days this month for a daily gift. One box per day!', '남은 기간': 'Time left', '이번 축제 선물을 모두 받았어요': 'All festival gifts claimed',
'주간 랭킹': 'Weekly Ranking', '이번 주(': 'This week (', ') 물리친 좀비 수 + 승리 300점 · 내 점수': '): zombies defeated + 300 per win · My score', '불러오는 중...': 'Loading...',
'온라인 순위표에 연결되지 않았어요.': 'Not connected to the online leaderboard.', 'hankuk-in.com 에서 열면 순위가 보여요.': 'Open on hankuk-in.com to see rankings.', '순위를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.': "Couldn't load rankings. Please try again later.",
'아직 이번 주 기록이 없어요. 첫 번째가 되어 보세요!': 'No scores this week yet. Be the first!', '로그인하고 내 점수 올리기': 'Log in to post my score', '내 친구 코드': 'My friend code', '곧 열려요': 'Coming soon',
'친구 추가, 하루 한 번 횃불 선물 주고받기, 친구 동료 빌려 쓰기를 준비하고 있어요.': "Coming: add friends, trade a daily Torch gift, and borrow friends' heroes.",
'문파를 세우거나 들어가서 문파원과 함께 우두머리 좀비를 잡고, 문파 상점과 문파 출석 보상을 받게 돼요.': 'Found or join a clan to hunt boss zombies together and earn clan shop and check-in rewards.',
'문파 만들기': 'Create clan', '문파 찾기': 'Find clan', '내 문파:': 'My clan:', '아직 문파가 없어요': 'No clan yet', '챕터에 들어갈 때 5개를 써요. 6분마다 1개씩 차오르고 최대 30개예요.': 'Each chapter costs 5. Refills 1 every 6 minutes, up to 30.',
'옥 40으로 30개': '30 for 40 Jade', '패스 선물을 받았어요': 'Pass reward claimed', '황금 패스 선물을 받았어요': 'Golden Pass reward claimed', '결제는 준비 중이에요. 곧 열려요!': 'Payments are coming soon!',
'업적 보상을 받았어요': 'Achievement reward claimed', '도감 보상 옥': 'Collection reward Jade', '축제 선물을 받았어요': 'Festival gift claimed', '앞 챕터를 먼저 깨야 해요': 'Clear the previous chapter first',
'보상 상자: 옥 50, 신력석 5': 'Reward chest: 50 Jade, 5 Spirit Stones', '받았어요': 'Claimed', '· 레벨 올라감!': '· Level up!', '빠른 순찰: 엽전': 'Quick Patrol: coins', '일째 출석 보상을 받았어요': 'check-in reward claimed',
'첫 선물을 받았어요': 'First gift claimed', '저장을 모두 지우고 처음부터 할까요?': 'Erase all progress and start over?', '(경험': '(XP', '공격력': 'ATK', '· 체력': '· HP', '· 전투력': '· Power', '깬 챕터': 'Chapters cleared',
'· 도전': '· Play', '엽전이나': 'Not enough coins or', '도면이 모자라요': 'Not enough blueprints', '최대 레벨이에요. 합성으로 등급을 올리세요': 'Max level. Merge to raise the grade.', '가장 좋은 장비를 입었어요': 'Best gear equipped',
'합성': 'Merge', '번 성공!': 'merged!', '합성할 장비가 없어요': 'Nothing to merge', '개를 얻었어요': 'obtained', '별': 'Stars', '개!': '!', '이(가) 함께해요!': 'joined you!', '시험용: 옥 300': 'Test: 300 Jade', '시험용: 옥 1,000': 'Test: 1,000 Jade',
'보상이 2배가 됐어요': 'Rewards doubled', '처용, 조선좀비 (K-ZOMBIE)': 'K Zombi', '밤 맞이': 'Start Night', '처용, 조선좀비': 'K Zombi', '조선 수호신 디펜스 · 전투 시험 화면': 'Joseon guardian defense · battle test',
'전투 시작': 'Start Battle', '일시정지': 'Paused', '숨을 고르는 중': 'Catching your breath', '계속하기': 'Resume', '포기하고 나가기': 'Give up', '다시 하기': 'Retry',
'전투력': 'Power', "철갑": "Armored", "광폭": "Berserk", "거대": "Giant", "☁ 저장 중": "☁ Saving", "구글로 로그인하고 내 점수 올리기": "Sign in with Google to post my score", "hankuk-in.com 에서 열어야 로그인할 수 있어요": "Open on hankuk-in.com to sign in", "계정 연결을 준비 중이에요. 잠시 뒤 다시 눌러 주세요": "Connecting your account. Please tap again in a moment", "구글 계정으로 로그인했어요": "Signed in with Google", "이 주소에서는 구글 로그인이 아직 허용되지 않았어요": "Google sign-in is not allowed on this address yet", "구글 로그인이 아직 켜지지 않았어요 (관리자 설정 필요)": "Google sign-in is not enabled yet (admin setup needed)", "이 이메일은 이메일 로그인으로 가입돼 있어요. 이메일로 로그인해 주세요": "This email is registered with email sign-in. Please sign in with email", "로그인하지 못했어요:": "Sign-in failed:", "로그인 모듈을 불러오지 못했어요": "Couldn't load the sign-in module", "엽전·장비·영웅 기록이 계정에 저장되고, 다른 기기에서 로그인하면 이어서 할 수 있어요.": "Your coins, gear and heroes are saved to your account, so you can continue on any device.", "지금 저장": "Save now", "로그인하지 않아도 이 기기에 저장돼요. 로그인하면 다른 기기에서도 이어서 할 수 있어요. (Anibrix·ASCEND와 같은 계정)": "Progress is saved on this device even without signing in. Sign in to continue on other devices. (Same account as Anibrix and ASCEND)", "구글로 가입·로그인": "Sign up / in with Google", "이메일로 로그인": "Sign in with email", "로그아웃할까요? 이 기기 저장은 그대로 남아요.": "Log out? Progress on this device stays.", "계정에 저장했어요": "Saved to your account", '계정': 'Account', '지금은 이 기기에만 저장돼요. hankuk-in.com 에서 열면 구글 계정으로 저장할 수 있어요.': 'Saved on this device only. Open on hankuk-in.com to save with your Google account.', '구글로 로그인': 'Sign in with Google', '구글 계정으로 저장': 'Save with Google', '로그아웃': 'Log out', '로그인': 'Log in', '레벨 올리기': 'Level up', '닫기': 'Close', '취소': 'Cancel', '뽑기': 'Summon', '동료 뽑기': 'Hero Summon',
'쿠폰 입력': 'Enter code', '행사 코드를 입력하세요': 'Enter your event code', '쿠폰 코드': 'Code', '결제 준비 중': 'Coming soon', '없는 코드예요': 'Invalid code', '이미 쓴 코드예요': 'Code already used', '쿠폰 보상: 옥': 'Code reward: Jade',
/* 친구·문파 */
'로그인이 필요해요': 'Login required', '온라인 연결 안 됨': 'Not connected', 'hankuk-in.com 에서 열면 친구·문파를 쓸 수 있어요.': 'Open on hankuk-in.com to use Friends and Clans.', '서버에 연결하지 못했어요': 'Could not reach the server', '구글로 가입·로그인': 'Sign up / log in with Google', '신청': 'Request', '받은 신청': 'Requests', '수락': 'Accept', '거절': 'Decline', '🔥 받기': '🔥 Take', '🔥 보내기': '🔥 Send', '보냄': 'Sent', '알 수 없음': 'Unknown', '아직 친구가 없어요. 친구 코드를 주고받아 보세요!': 'No friends yet. Trade friend codes!', '친구 코드 6자리': '6-letter friend code', '친구 코드를 넣어 주세요': 'Enter a friend code', '내 코드예요': 'That\'s your code', '없는 친구 코드예요': 'No such friend code', '이미 친구예요': 'Already friends', '친구는 30명까지예요': 'Up to 30 friends', '친구가 되었어요!': 'You are now friends!', '친구 신청을 보냈어요': 'Friend request sent', '신청을 거절했어요': 'Request declined', '횃불을 선물했어요': 'Torch sent', '오늘은 10개까지 받을 수 있어요': 'You can take up to 10 a day', '횃불 +1': 'Torch +1', '접속 중': 'Online', '내 문파': 'My Clan', '주간 순위': 'Weekly Rank', '문파 이름 검색': 'Search clan name', '검색': 'Search', '가입': 'Join', '문파가 없어요. 직접 세워 보세요!': 'No clans yet. Found one!', '문파 이름 (2~12자)': 'Clan name (2-12)', '세우기': 'Found', '이번 주 문파 기록이 아직 없어요': 'No clan records this week', '보상 받기': 'Claim', '문파원': 'Members', '문주': 'Leader', '강퇴': 'Kick', '문파 해산': 'Disband', '탈퇴': 'Leave', '문파 출석!': 'Clan check-in!', '내보냈어요': 'Kicked', '문파 이름은 2~12자예요': 'Clan name must be 2-12 characters', '엽전이 모자라요': 'Not enough coins', '이미 있는 문파 이름이에요': 'That clan name is taken', '문파원이 가득 찼어요': 'The clan is full', '이 문파에는 들어갈 수 없어요': 'You can\'t join this clan', '문파를 해산했어요': 'Clan disbanded', '문파에서 나왔어요': 'You left the clan', '문파에서 내보내졌어요': 'You were removed from the clan', '문파가 해산되었어요': 'The clan was disbanded', '이 문파원을 내보낼까요?': 'Remove this member?', '문파에서 나갈까요?': 'Leave the clan?', '문파를 해산할까요? 문파 이름은 다시 쓸 수 없어요.': 'Disband the clan? The name cannot be reused.', '출석한 문파원이 많을수록 모두의 보상이 커져요 (엽전 200×출석 인원, 5명 이상이면 옥 20 추가)': 'More members checking in means bigger rewards for all (200 coins × check-ins, +20 Jade at 5+)'
};

/* 숫자가 섞인 문장 규칙 (앞에서부터 적용) */
const RULES = [
  [/친구 (\d+)\/30 · 오늘 받은 횃불 (\d+)\/10/g, (m, a, b) => 'Friends ' + a + '/30 · Torches today ' + b + '/10'],
  [/레벨 (\d+) · 전투력 ([\d,.KM]+)/g, (m, a, b) => 'Lv.' + a + ' · Power ' + b],
  [/(\d+)분 전/g, (m, a) => a + 'm ago'], [/(\d+)시간 전/g, (m, a) => a + 'h ago'], [/(\d+)일 전/g, (m, a) => a + 'd ago'],
  [/문파원 (\d+)\/20/g, (m, a) => 'Members ' + a + '/20'], [/이번 주 공헌 ([\d,.KM]+)마리/g, (m, a) => 'This week ' + a + ' kills'], [/이번 주 ([\d,.KM]+)마리/g, (m, a) => 'week ' + a + ' kills'],
  [/문파 출석 (\d+)\/(\d+)/g, (m, a, b) => 'Clan check-in ' + a + '/' + b], [/문파 세우기 \(엽전 ([\d,]+)\)/g, (m, a) => 'Found a clan (' + a + ' coins)'],
  [/받은 신청 (\d+)/g, (m, a) => 'Requests ' + a], [/문파 출석 보상: 엽전 ([\d,]+)(, 옥 20)?/g, (m, a, b) => 'Clan reward: ' + a + ' coins' + (b ? ', 20 Jade' : '')],
  [/문파 「(.+)」를 세웠어요!/g, (m, a) => 'Founded clan "' + a + '"!'], [/「(.+)」에 들어왔어요!/g, (m, a) => 'Joined "' + a + '"!'],
  [/이번 주\((.+)\) 문파원이 물리친 좀비 수 합계/g, (m, a) => 'Zombies slain by members this week (' + a + ')'], [/실패했어요: (.+)/g, (m, a) => 'Failed: ' + a],
  [/구글 로그인하면 친구 코드로 친구를 맺고 날마다 횃불을 주고받을 수 있어요\./g, () => 'Log in with Google to add friends by code and trade torches daily.'],
  [/구글 로그인하면 문파를 세우거나 들어가 문파원과 함께 출석 보상과 주간 순위를 겨룰 수 있어요\./g, () => 'Log in with Google to found or join a clan, share check-in rewards and compete weekly.'],
  [/잠시 뒤 다시 열어 주세요\. \((.*)\)/g, (m, a) => 'Please try again later. (' + a + ')'],
  [/영웅까지 같은 장비 3개 · 전설·신화는 같은 칸 2개를 먹여 \+1~\+3 · 도면/g, () => 'Up to Hero: merge 3 identical · Legendary/Mythic: feed 2 of the same slot for +1~+3 · Blueprints'],
  [/(\d+)개 · 별을 올리면 전투 속 기술이 세져요/g, (m, n) => n + ' · Raise stars to power up skills in battle'],
  [/(\d+)년 (\d+)월 시즌 · 전투를 하면 패스 점수가 쌓여요/g, (m, y, mo) => y + '-' + mo + ' season · Battles earn pass points'],
  [/(\d+)년 (\d+)월 시즌/g, (m, y, mo) => y + '-' + mo + ' season'],
  [/^(\d+)번째 밤$/, (m, n) => 'Night ' + n],
  [/(\d+)\/(\d+)번째 밤/g, (m, a, b) => 'Night ' + a + '/' + b],
  [/(\d+)번째 밤/g, (m, n) => 'Night ' + n],
  [/본부 (\d+)레벨!?/g, (m, n) => 'HQ Lv.' + n + (m.endsWith('!') ? '!' : '')],
  [/(\d+)레벨 성벽 완성!/g, (m, n) => 'Lv.' + n + ' Wall built!'],
  [/(\d+)레벨 /g, (m, n) => 'Lv.' + n + ' '],
  [/(\d+)레벨/g, (m, n) => 'Lv.' + n],
  [/이미 세운 (.+?)[을를] 강화한다 \(위력 \+40%\)/g, (m, a) => 'Upgrade your ' + a + ' (power +40%)'],
  [/(\S+) (\d+)명이 쏜다/g, (m, a, n) => n + ' ' + a + (n > 1 ? 's' : '') + ' shooting'],
  [/병사 최대 (\d+)명/g, (m, n) => 'Up to ' + n + ' soldiers'],
  [/밤마다 엽전 \+(\d+)/g, (m, n) => '+' + n + ' coins per night'],
  [/주변 회복 (\d+)\/초/g, (m, n) => 'Heals ' + n + '/s nearby'],
  [/적 ([\d,]+)마리 물리치기/g, (m, n) => 'Defeat ' + n + ' enemies'],
  [/좀비 ([\d,]+)마리 물리치기/g, (m, n) => 'Defeat ' + n + ' zombies'],
  [/챕터 (\d+) · 밤 (\d+)번/g, (m, a, b) => 'Chapter ' + a + ' · ' + b + ' Nights'],
  [/밤 (\d+)번을 버티면 이겨요\./g, (m, n) => 'Survive ' + n + ' nights to win.'],
  [/(\d+)시간 (\d+)분/g, (m, h, mm) => h + 'h ' + mm + 'm'],
  [/(\d+)일째 출석 보상을 받았어요/g, (m, n) => 'Day ' + n + ' check-in reward claimed'],
  [/(\d+)일째 받기/g, (m, n) => 'Claim Day ' + n],
  [/(\d+)일째/g, (m, n) => 'Day ' + n],
  [/(\d+)번 성공!/g, (m, n) => n + ' merged!'],
  [/(.+?) 도면 (\d+)개를 얻었어요/g, (m, a, n) => 'Got ' + n + ' ' + a + ' blueprints'],
  [/(\S+)이\(가\) 함께해요!/g, (m, a) => a + ' joined you!'],
  [/(\S+) 합류!/g, (m, a) => a + ' joins!'],
  [/(.+?) 진화!/g, (m, a) => a + ' evolved!'],
  [/(.+?) 수호 성공/g, (m, a) => a + ' defended'],
  [/(.+?)[을를] 넘기지 못했다/g, (m, a) => 'Failed to survive ' + a],
  [/(\d+)단계/g, (m, n) => 'Tier ' + n],
  [/(\d+)초/g, (m, n) => n + 's'],
  [/(\d+)개/g, (m, n) => n]
];

const keys = Object.keys(DICT).filter(k => k).sort((a, b) => b.length - a.length);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BIG = new RegExp(keys.map(esc).join('|'), 'g');
const HAN = /[\uac00-\ud7a3]/;
const PARTICLE = /([A-Za-z0-9\)\]%!.])\s?(을|를|이|가|은|는|와|과|의|에게|으로|로|에)(?=[\s.,!?·)]|$)/g;
const cache = new Map();
function tr(s) {
  if (typeof s !== 'string' || !HAN.test(s)) return s;
  const c = cache.get(s); if (c !== undefined) return c;
  let o = s; const t = s.trim();
  if (DICT[t] != null) o = s.replace(t, DICT[t]);
  else {
    for (const [re, fn] of RULES) { re.lastIndex = 0; o = o.replace(re, fn); }
    o = o.replace(BIG, (m, off, str) => { const pv = str[off - 1] || '', nx = str.slice(off + m.length); if (HAN.test(pv) && !/^[을를이가은는와과의에로]/.test(m)) return m; if (HAN.test(nx[0] || '') && !/^(을|를|이|가|은|는|와|과|의|에게|으로|로|에)(?![\uac00-\ud7a3])/.test(nx)) return m; return DICT[m]; });
    o = o.replace(PARTICLE, '$1').replace(/ {2,}/g, ' ');
  }
  if (cache.size > 6000) cache.clear();
  cache.set(s, o); return o;
}
window.JZtr = tr;

/* 캔버스 글자 */
const P = CanvasRenderingContext2D.prototype, fT = P.fillText, sT = P.strokeText, mT = P.measureText;
const fit = (ctx, s, t, mw) => { if (mw != null || s === t) return mw; const a = mT.call(ctx, s).width, b = mT.call(ctx, t).width; const lim = a * 1.3 + 36; return b > lim && a > 0 ? lim : undefined; };
P.fillText = function (s, x, y, mw) { const t = tr(s); const w = fit(this, s, t, mw); return w === undefined ? fT.call(this, t, x, y) : fT.call(this, t, x, y, w); };
P.strokeText = function (s, x, y, mw) { const t = tr(s); const w = fit(this, s, t, mw); return w === undefined ? sT.call(this, t, x, y) : sT.call(this, t, x, y, w); };
P.measureText = function (s) { return mT.call(this, tr(s)); };

/* 화면 글자(DOM) */
const ATTR = ['title', 'placeholder', 'aria-label', 'data-t'];
function walk(n) {
  if (n.nodeType === 3) { const v = n.data; if (HAN.test(v)) { const t = tr(v); if (t !== v) n.data = t; } return; }
  if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
  for (const a of ATTR) { const v = n.getAttribute && n.getAttribute(a); if (v && HAN.test(v)) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
  for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
}
const mo = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') walk(m.target); else if (m.type === 'attributes') walk(m.target); else for (const n of m.addedNodes) walk(n); } });
function boot() { walk(document.documentElement); mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR }); }
document.title = 'K Zombi';
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
/* alert/confirm 문구 */
const al = window.alert, cf = window.confirm; window.alert = m => al(tr(String(m))); window.confirm = m => cf(tr(String(m)));
})();

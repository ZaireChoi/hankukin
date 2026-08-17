import type { Lang } from "../i18n";
import type { Theme } from "../components/TripSetup";
import type { ChainDay, ChainNode } from "./day-chain";
import { cityName } from "./naming";

/**
 * What this day is, said in a sentence — and only from things we know.
 *
 * The traveler asked for "상세계획과 스토리". The temptation is obvious and
 * wrong: write that Gyeongbokgung was the seat of the Joseon court, that the
 * changing of the guard is at 10:00, that the persimmon trees turn in
 * October. Every one of those is a claim about a PLACE, and the only place
 * facts we hold are a name, a district, a category, and hours that 1,567
 * records admit they have not checked. A model filling that gap writes
 * confident prose that nobody verified — the same failure as ₩8,940,000 on
 * the old plan cards, except prose hides it better.
 *
 * So the story narrates the SHAPE OF THE DAY, not the contents of the places:
 *
 *   what it starts from      an airport, or the bed you woke up in
 *   what it is mostly about  the categories that actually dominate the stops
 *   what it costs you        walking, backtracking, a long transfer
 *   how it ends              a late finish, an early night, a city change
 *
 * Every one of those is DERIVED from the chain we already built. Nothing in
 * the paragraph is a fact about Korea; all of it is a fact about this trip.
 * That turns out to be the more useful sentence anyway — a traveler can read
 * the palace's own signboard when they get there, but nobody else will tell
 * them that today is four hours of walking with the hard part after lunch.
 *
 * ── The theme is the lens, not the source ───────────────────────────────
 *
 * Two travelers with the same cities and dates get the same chain. The theme
 * decides which true sentence about that chain leads. A heritage traveler is
 * told how much of the day is old-town walking; a family is told where the
 * long gaps are. Same facts, different first sentence — because the theme is
 * the one thing about the trip that the route genuinely cannot infer.
 */

export type StoryLine = {
  text: string;
  /**
   * What this sentence was computed from. Rendered on demand, the same way
   * cost lines carry their provenance — a claim you cannot inspect is a claim
   * you should not have made.
   */
  basis: string;
};

export type DayStory = { title: string; lines: StoryLine[] };

const L = <T,>(en: T, ko: T, ja: T, zhHans: T, zhHant: T): Record<Lang, T> =>
  ({ en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant });

/**
 * Which of our categories a theme is actually about.
 *
 * `nature` maps to nothing on purpose. The place taxonomy has heritage,
 * family, experience, food, shopping, comfort and rest — no outdoors. A
 * traveler who picked "coast & nature" therefore gets no lens sentence,
 * because the only ones available would be guesses dressed as observations.
 * Silence is the correct output for a question our data cannot answer.
 */
const THEME_CATEGORIES: Record<Theme, string[]> = {
  heritage: ["heritage"],
  food: ["food"],
  family: ["family", "experience"],
  shopping: ["shopping"],
  nature: [],
};

/** Which category the day actually leans on, from the stops themselves. */
function dominant(nodes: ChainNode[]): { key: string; share: number; count: number } {
  const places = nodes.filter((n) => n.option);
  if (!places.length) return { key: "none", share: 0, count: 0 };
  const tally = new Map<string, number>();
  for (const n of places) tally.set(n.option!.category, (tally.get(n.option!.category) ?? 0) + 1);
  let key = "none", best = 0;
  for (const [k, v] of tally) if (v > best) { key = k; best = v; }
  return { key, share: best / places.length, count: places.length };
}

/** Minutes of walking the day asks for, using the walk grade we hold per place. */
const WALK_WEIGHT: Record<string, number> = { low: 0.2, medium: 0.5, high: 0.85 };
function walkLoad(nodes: ChainNode[]): number {
  return Math.round(
    nodes.filter((n) => n.option)
      .reduce((m, n) => m + n.option!.stayMinutes * (WALK_WEIGHT[n.option!.walk] ?? 0.4), 0),
  );
}

const OPENINGS = {
  arrival: L(
    "The day starts in an airport, so it is really half a day — everything below is what fits after you are through the doors.",
    "공항에서 시작하는 하루라 사실상 반나절입니다. 아래는 문을 나선 뒤에 들어가는 것들입니다.",
    "空港から始まる一日なので実質は半日です。以下は到着ロビーを出てから入るものです。",
    "这一天从机场开始，实际只有半天。下面是出关之后能塞进去的安排。",
    "這一天從機場開始，實際只有半天。下面是出關之後能塞進去的安排。",
  ),
  carried: L(
    "You wake up where last night ended, so the morning costs you nothing but breakfast.",
    "어젯밤이 끝난 곳에서 아침을 맞습니다. 오전에 드는 비용은 아침 식사뿐입니다.",
    "昨夜が終わった場所で朝を迎えます。午前にかかるのは朝食だけです。",
    "在昨晚结束的地方醒来，上午只花一顿早饭的时间。",
    "在昨晚結束的地方醒來，上午只花一頓早飯的時間。",
  ),
  moving: L(
    "Today you change city, which eats the middle of the day whatever you do with the rest of it.",
    "오늘은 도시를 옮깁니다. 나머지를 어떻게 짜든 한낮이 이동에 들어갑니다.",
    "今日は都市を移動します。残りをどう組んでも日中が移動に消えます。",
    "今天要换城市，不管其余怎么安排，中间这段时间都会被路程吃掉。",
    "今天要換城市，不管其餘怎麼安排，中間這段時間都會被路程吃掉。",
  ),
  home: L(
    "The last day belongs to the airport. Anything before it has to be back in time.",
    "마지막 날은 공항의 것입니다. 그 앞에 넣는 것은 무엇이든 제시간에 돌아와야 합니다.",
    "最終日は空港のものです。その前に入れるものは何であれ時間内に戻る必要があります。",
    "最后一天属于机场。之前安排的任何事都得赶得回来。",
    "最後一天屬於機場。之前安排的任何事都得趕得回來。",
  ),
};

/** The theme's own sentence about the day. One per theme, and it must be true. */
const LENS: Record<Theme, (n: number, city: string) => Record<Lang, string>> = {
  heritage: (n) => L(
    `${n} of today's stops are old town and heritage ground, which is where the walking comes from.`,
    `오늘 일정 중 ${n}곳이 옛 도심과 문화유산입니다. 걷는 양이 여기서 나옵니다.`,
    `今日の${n}か所が旧市街と文化遺産です。歩く量はここから来ます。`,
    `今天有 ${n} 处在老城与文化遗产区，步行量主要来自这里。`,
    `今天有 ${n} 處在老城與文化遺產區，步行量主要來自這裡。`,
  ),
  food: (n) => L(
    `${n} stops are markets and meals, so the day is short walks between eating rather than one long route.`,
    `${n}곳이 시장과 식사입니다. 하루가 긴 동선 하나가 아니라 먹는 곳 사이의 짧은 이동으로 이어집니다.`,
    `${n}か所が市場と食事です。長い一本の動線ではなく、食べる場所の間の短い移動が続きます。`,
    `有 ${n} 处是市场与用餐，所以这一天是吃与吃之间的短程走动，而不是一条长线路。`,
    `有 ${n} 處是市場與用餐，所以這一天是吃與吃之間的短程走動，而不是一條長線路。`,
  ),
  family: (n) => L(
    `${n} stops, and the gaps between them are where a day with children actually goes wrong — they are marked below.`,
    `${n}곳입니다. 아이와 함께라면 하루가 어긋나는 곳은 장소가 아니라 그 사이의 빈틈입니다. 아래에 표시했습니다.`,
    `${n}か所です。子ども連れで一日が崩れるのは場所ではなく、その間の空き時間です。下に示しています。`,
    `共 ${n} 处。带孩子出行时出问题的往往不是地点，而是它们之间的空档——下面已标出。`,
    `共 ${n} 處。帶孩子出行時出問題的往往不是地點，而是它們之間的空檔——下面已標出。`,
  ),
  shopping: (n) => L(
    `${n} stops sit in shopping districts, which stay open later than the museums do — the evening is yours.`,
    `${n}곳이 쇼핑 구역에 있습니다. 박물관보다 늦게까지 열기 때문에 저녁 시간이 남습니다.`,
    `${n}か所が商業エリアです。美術館より遅くまで開いているので夜が使えます。`,
    `有 ${n} 处位于商业区，比博物馆关得晚，晚上是你的时间。`,
    `有 ${n} 處位於商業區，比博物館關得晚，晚上是你的時間。`,
  ),
  nature: (n) => L(
    `${n} stops are coast and open ground, so this day is the one weather can rewrite.`,
    `${n}곳이 바다와 트인 곳입니다. 날씨가 다시 쓸 수 있는 하루가 바로 오늘입니다.`,
    `${n}か所が海と屋外です。天気に書き換えられる可能性が最も高い一日です。`,
    `有 ${n} 处在海边与开阔地，这一天最容易被天气改写。`,
    `有 ${n} 處在海邊與開闊地，這一天最容易被天氣改寫。`,
  ),
};

const WALK = (minutes: number) => L(
  `Roughly ${minutes} minutes of it is on your feet — our estimate, from how much walking each stop is graded for.`,
  `그중 대략 ${minutes}분은 서서 걷는 시간입니다. 각 장소의 보행 난이도에서 뽑은 저희 추정치입니다.`,
  `うち約${minutes}分は歩いている時間です。各スポットの歩行負荷から出した当方の推定です。`,
  `其中约 ${minutes} 分钟是在步行——这是我们依据各地点的步行强度做的估算。`,
  `其中約 ${minutes} 分鐘是在步行——這是我們依據各地點的步行強度做的估算。`,
);

const LATE = L(
  "It finishes late, so leave the next morning loose.",
  "늦게 끝납니다. 다음 날 아침은 여유 있게 두세요.",
  "終わりが遅くなります。翌朝はゆとりを持たせてください。",
  "结束得晚，第二天早上留松一点。",
  "結束得晚，第二天早上留鬆一點。",
);

const THIN = L(
  "Only one stop is planned, which leaves most of the day open — that is a choice, not a gap we failed to fill.",
  "계획된 곳이 하나뿐이라 하루 대부분이 비어 있습니다. 못 채운 것이 아니라 그렇게 둔 것입니다.",
  "予定は1か所だけで、一日の大半が空いています。埋められなかったのではなく、そう置いてあります。",
  "只安排了一处，一天的大部分是空的。这是选择，不是没填上的空白。",
  "只安排了一處，一天的大部分是空的。這是選擇，不是沒填上的空白。",
);

/**
 * Build the day's paragraph.
 *
 * `themes` may be empty — a traveler who skipped the question still gets the
 * shape of their day, just without the lens sentence. The story never invents
 * a theme to have something to say.
 */
export function storyFor(day: ChainDay, themes: Theme[], lang: Lang): DayStory {
  const lines: StoryLine[] = [];
  const kinds = new Set(day.nodes.map((n) => n.kind));
  /*
   * A day moves iff the chain put stations in it.
   *
   * The first version counted distinct `city` values on the day's nodes, and
   * that read "you change city today" on every single day. Stay nodes carry
   * the Korean city name (서울) and place nodes carry the city id (seoul), so
   * the set was never smaller than two. Same-looking data, two vocabularies —
   * and the sentence sounded perfectly plausible while being wrong six days
   * out of eight. Ask the structure instead: buildChain only emits a station
   * pair when the city actually changes.
   */
  const moves = day.nodes.some((n) => n.kind === "station");
  const places = day.nodes.filter((n) => n.option);
  const last = day.nodes[day.nodes.length - 1];

  // 1. How the day opens — read off the chain, not assumed from the date.
  if (kinds.has("home")) lines.push({ text: OPENINGS.arrival[lang], basis: "day starts at an airport node" });
  else if (kinds.has("home-again")) lines.push({ text: OPENINGS.home[lang], basis: "day contains the flight home" });
  else if (moves) lines.push({ text: OPENINGS.moving[lang], basis: "the chain has an intercity leg today" });
  else if (day.nodes[0]?.carried) lines.push({ text: OPENINGS.carried[lang], basis: "opens on yesterday's stay" });

  /*
   * 2. The theme's lens.
   *
   * The count in the sentence must be the stops that ACTUALLY match the
   * theme, not the stops on the day. The first version said "4 of today's
   * stops are old town and heritage ground" while its own basis line read
   * `dominant category=family` — the sentence was counting the day and
   * claiming the theme. That is the exact failure this module exists to
   * avoid, and it survived one screenshot before being caught.
   */
  const dom = dominant(day.nodes);
  const lens = themes.find((th) => THEME_CATEGORIES[th]?.length);
  const matching = lens
    ? places.filter((n) => THEME_CATEGORIES[lens].includes(n.option!.category)).length
    : 0;
  if (lens && matching >= 2) {
    lines.push({
      text: LENS[lens](matching, day.city)[lang],
      basis: `theme=${lens}, ${matching}/${dom.count} places in ${THEME_CATEGORIES[lens].join("+")}`,
    });
  } else if (dom.count === 1) {
    lines.push({ text: THIN[lang], basis: "one place on this day" });
  }

  // 3. What it costs the body. Marked as our estimate, because it is.
  const walk = walkLoad(day.nodes);
  if (walk >= 45) lines.push({ text: WALK(walk)[lang], basis: `walk grades of ${places.length} places` });

  // 4. When it ends.
  const finish = [...day.nodes].reverse().find((n) => n.clock !== null)?.clock ?? null;
  if (finish !== null && finish >= 20 * 60) lines.push({ text: LATE[lang], basis: `last known time ${finish}` });

  const city = cityName(lang, day.city);
  const title = [city.lead, city.companion].filter(Boolean).join(" ");
  return { title, lines };
}

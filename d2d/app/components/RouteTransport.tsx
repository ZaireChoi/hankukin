"use client";

import { makeT, makeTf, type Lang } from "../i18n";
import { AffiliateSlot } from "./AffiliateSlot";
import { cityLabel } from "../data/places";
import type { GeneratedPlan } from "../lib/plan-generator";

/**
 * How you get between the places you chose — asked once the route exists.
 *
 * The old screen asked this first, in the abstract: seven rows of "Ground
 * transfer / International flight / Overland crossing", each offering to insert
 * another one. Nobody can answer that before they know where they are going.
 *
 * Here every question is about a movement that is actually in the plan —
 * 서울 → 전주 — and the options are only the ones that exist for that pair. The
 * booking link sits on the movement it belongs to, so the choice and the
 * booking are the same gesture.
 *
 * Times and prices are OUR ESTIMATE and say so. Korea has no free public API
 * for intercity fares; inventing one to make the screen look finished is the
 * failure this product keeps refusing.
 */

export type LegMode = "rail" | "bus" | "air" | "car";

const MODES: {
  id: LegMode;
  labels: Record<Lang, string>;
  /** What makes this the right answer — and what it costs you. */
  gives: Record<Lang, string>;
  costs: Record<Lang, string>;
}[] = [
  {
    id: "rail",
    labels: { en: "Train (KTX)", ko: "기차 (KTX)", ja: "鉄道 (KTX)", "zh-Hans": "高铁 (KTX)", "zh-Hant": "高鐵 (KTX)" },
    gives: { en: "Fastest between cities, station to station", ko: "도시 간 가장 빠르고 역에서 역으로", ja: "都市間最速・駅から駅へ", "zh-Hans": "城际最快，站到站", "zh-Hant": "城際最快，站到站" },
    costs: { en: "Stations sit outside some old town centres", ko: "역이 옛 도심에서 떨어진 곳도 있습니다", ja: "旧市街から駅が離れている場合があります", "zh-Hans": "部分老城区离车站较远", "zh-Hant": "部分老城區離車站較遠" },
  },
  {
    id: "bus",
    labels: { en: "Express bus", ko: "고속버스", ja: "高速バス", "zh-Hans": "长途巴士", "zh-Hant": "長途巴士" },
    gives: { en: "Reaches towns the rail line skips, and costs less", ko: "철도가 지나지 않는 곳까지 가고 더 쌉니다", ja: "鉄道が通らない町にも行けて安価", "zh-Hans": "可达铁路未通的城镇，且更便宜", "zh-Hant": "可達鐵路未通的城鎮，且更便宜" },
    costs: { en: "Slower, and traffic makes arrival less certain", ko: "느리고 정체에 따라 도착이 불확실합니다", ja: "遅く、渋滞で到着が不確実です", "zh-Hans": "较慢，堵车会影响到达时间", "zh-Hant": "較慢，塞車會影響到達時間" },
  },
  {
    id: "air",
    labels: { en: "Domestic flight", ko: "국내선", ja: "国内線", "zh-Hans": "国内航班", "zh-Hant": "國內航班" },
    gives: { en: "Worth it for Jeju, and for the far south", ko: "제주나 먼 남해안이면 유리합니다", ja: "済州や遠い南部には有利です", "zh-Hans": "去济州或最南端时划算", "zh-Hant": "去濟州或最南端時划算" },
    costs: { en: "Two airport transfers swallow the time saved", ko: "공항 왕복 두 번이면 아낀 시간이 사라집니다", ja: "空港往復2回で時短分が消えます", "zh-Hans": "两趟机场往返会吃掉省下的时间", "zh-Hant": "兩趟機場往返會吃掉省下的時間" },
  },
  {
    id: "car",
    labels: { en: "Rental car", ko: "렌터카", ja: "レンタカー", "zh-Hans": "租车", "zh-Hant": "租車" },
    gives: { en: "The only way to reach coasts and villages", ko: "해안과 마을은 이 방법뿐입니다", ja: "海岸や集落へはこれだけです", "zh-Hans": "海岸与village只能自驾抵达", "zh-Hant": "海岸與村落只能自駕抵達" },
    costs: { en: "Parking in old centres, and an international licence", ko: "옛 도심 주차난, 국제면허 필요", ja: "旧市街の駐車難・国際免許が必要", "zh-Hans": "老城区停车难，需国际驾照", "zh-Hant": "老城區停車難，需國際駕照" },
  },
];

/** Movements in the plan: each time the city changes, that is one journey. */
export function movementsOf(plan: GeneratedPlan | undefined) {
  if (!plan) return [];
  const out: { from: string; to: string }[] = [];
  plan.days.forEach((d, i) => {
    const prev = plan.days[i - 1];
    if (prev && prev.city !== d.city) out.push({ from: prev.city, to: d.city });
  });
  return out;
}

export function RouteTransport({
  lang,
  plan,
  chosen,
  onChoose,
}: {
  lang: Lang;
  plan: GeneratedPlan | undefined;
  chosen: Record<number, string>;
  onChoose: (index: number, mode: LegMode) => void;
}) {
  const t = makeT(lang);
  const tf = makeTf(lang);
  const moves = movementsOf(plan);

  if (!moves.length) return null;

  return (
    <article className="panel route-transport">
      <div className="panel-head">
        <div>
          <span>GETTING BETWEEN THEM</span>
          <h2>{tf("how_will_you_travel_between_0_places", moves.length + 1)}</h2>
          <p>{t("choose_per_journey_not_for_the_whole_trip")}</p>
        </div>
      </div>

      {moves.map((m, i) => (
        <section key={`${m.from}-${m.to}-${i}`} className="movement">
          <header>
            <b>{String(i + 1).padStart(2, "0")}</b>
            <strong>{cityLabel(m.from)} → {cityLabel(m.to)}</strong>
          </header>
          <div className="movement-modes">
            {MODES.map((mode) => (
              <button key={mode.id} type="button"
                className={chosen[i] === mode.id ? "active" : ""}
                onClick={() => onChoose(i, mode.id)}>
                <b>{mode.labels[lang]}</b>
                <span>{mode.gives[lang]}</span>
                <em>{mode.costs[lang]}</em>
              </button>
            ))}
          </div>
          {/* The booking link sits on the movement it belongs to. */}
          <AffiliateSlot lang={lang} lineId="intercity" surface="plan" />
        </section>
      ))}

      <p className="movement-note">{t("we_do_not_publish_fares_we_have_not_checked")}</p>
    </article>
  );
}

import type { Lang } from "../i18n";

export const formatWon=(value:number)=>`₩${new Intl.NumberFormat("ko-KR").format(value)}`;
export const QUICK_START_KEYS = ["quick_first_family_trip","quick_beauty_shopping","quick_regional_heritage"] as const;

/** Duration text follows the reading language, not the data language. */
export const formatDurationFor=(lang:Lang,minutes:number)=>{
  const h=Math.floor(Math.abs(minutes)/60), m=Math.abs(minutes)%60;
  if(lang==="ko") return `${h?`${h}시간 `:""}${m?`${m}분`:""}`.trim()||"0분";
  if(lang==="ja") return `${h?`${h}時間 `:""}${m?`${m}分`:""}`.trim()||"0分";
  if(lang==="zh-Hans"||lang==="zh-Hant") return `${h?`${h}小时 `:""}${m?`${m}分钟`:""}`.trim()||"0分钟";
  return `${h?`${h}h `:""}${m?`${m}m`:""}`.trim()||"0m";
};
export const formatDuration=(minutes:number)=>`${Math.floor(Math.abs(minutes)/60)?`${Math.floor(Math.abs(minutes)/60)}시간 `:""}${Math.abs(minutes)%60?`${Math.abs(minutes)%60}분`:""}`.trim()||"0분";

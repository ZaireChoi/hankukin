import type { Stop } from "../lib/types";
import { allOptions, coordinateFor } from "./places";
import type { CityId } from "../lib/types";

/**
 * `ko` and `rm` are NOT translated. Whatever language the traveler reads,
 * the Korean name is what a taxi driver understands and what Kakao/Naver
 * can actually search for.
 */
/**
 * `city` is a plain city id, not a two-value union.
 *
 * It used to be `"seoul" | "gyeongju"`, which quietly made the whole map a
 * Gyeongju feature: any place in Busan or Jeju could not even be typed.
 */
export type RouteCoordinate = { lat:number; lng:number; city:CityId; ko:string; en:string; rm:string };
export const routeCoordinates:Record<string,RouteCoordinate> = {
  "현재 숙소":{lat:37.5665,lng:126.9780,city:"seoul",ko:"서울 숙소",en:"Seoul stay",rm:"Seoul sukso"},
  "서울역":{lat:37.5547,lng:126.9707,city:"seoul",ko:"서울역",en:"Seoul Station",rm:"Seoul-yeok"},
  "신경주역":{lat:35.7984,lng:129.1386,city:"gyeongju",ko:"경주역",en:"Gyeongju Station",rm:"Gyeongju-yeok"},
  "황리단길":{lat:35.8383,lng:129.2093,city:"gyeongju",ko:"황리단길",en:"Hwangnidan-gil",rm:"Hwangnidan-gil"},
  "경주 숙소":{lat:35.8410,lng:129.2110,city:"gyeongju",ko:"경주 숙소",en:"Gyeongju stay",rm:"Gyeongju sukso"},
  "cheomseongdae":{lat:35.8347,lng:129.2191,city:"gyeongju",ko:"첨성대",en:"Cheomseongdae",rm:"Cheomseongdae"},
  "daereungwon":{lat:35.8397,lng:129.2100,city:"gyeongju",ko:"대릉원·천마총",en:"Daereungwon & Cheonmachong",rm:"Daereungwon · Cheonmachong"},
  "donggung":{lat:35.8346,lng:129.2266,city:"gyeongju",ko:"동궁과 월지",en:"Donggung & Wolji",rm:"Donggung-gwa Wolji"},
  "museum":{lat:35.8290,lng:129.2288,city:"gyeongju",ko:"국립경주박물관",en:"Gyeongju National Museum",rm:"Gungnip Gyeongju Bangmulgwan"},
  "children-museum":{lat:35.8292,lng:129.2285,city:"gyeongju",ko:"어린이박물관",en:"Children's Museum",rm:"Eorini Bangmulgwan"},
  "woljeonggyo":{lat:35.8290,lng:129.2135,city:"gyeongju",ko:"월정교",en:"Woljeonggyo",rm:"Woljeonggyo"},
  "hwarang":{lat:35.8803,lng:129.1952,city:"gyeongju",ko:"화랑마을",en:"Hwarang Village",rm:"Hwarang Maeul"},
  "hanbok-photo":{lat:35.8388,lng:129.2108,city:"gyeongju",ko:"한복 사진 산책",en:"Hanbok photo walk",rm:"Hanbok sajin sanchaek"},
  "craft":{lat:35.8307,lng:129.2139,city:"gyeongju",ko:"전통 공예",en:"Traditional craft",rm:"Jeontong gongye"},
  "market-food":{lat:35.8443,lng:129.2162,city:"gyeongju",ko:"성동시장",en:"Seongdong Market",rm:"Seongdong Sijang"},
  "hwangnidan-meal":{lat:35.8380,lng:129.2089,city:"gyeongju",ko:"황리단길 식사",en:"Hwangnidan meal",rm:"Hwangnidan-gil siksa"},
  "cafe-break":{lat:35.8374,lng:129.2105,city:"gyeongju",ko:"한옥 카페",en:"Hanok cafe",rm:"Hanok cafe"},
  "souvenir":{lat:35.8340,lng:129.2120,city:"gyeongju",ko:"기념품 쇼핑",en:"Souvenir shopping",rm:"Ginyeompum syoping"},
  "cool-drink":{lat:35.8377,lng:129.2102,city:"gyeongju",ko:"음료·물 보충",en:"Drink & water refill",rm:"Eumryo · mul bochung"},
  "winter-snack":{lat:35.8440,lng:129.2158,city:"gyeongju",ko:"겨울 간식",en:"Winter snacks",rm:"Gyeoul gansik"},
  "tea-house":{lat:35.8310,lng:129.2140,city:"gyeongju",ko:"전통차 휴식",en:"Traditional tea break",rm:"Jeontongcha hyusik"},
  "restroom-reset":{lat:35.8360,lng:129.2110,city:"gyeongju",ko:"화장실·충전 휴식",en:"Restroom & charging break",rm:"Hwajangsil · chungjeon hyusik"},
  "hotel-rest":{lat:35.8410,lng:129.2110,city:"gyeongju",ko:"숙소 휴식",en:"Hotel rest",rm:"Sukso hyusik"},
};

/**
 * The ingested places come first: they are the real product, and there are
 * thousands of them once the national ingest has run. The hand-written table
 * below stays as a fallback because it also holds the stops that are not
 * places at all — a station, "our hotel", the traveler's own stay.
 */
export const getRouteCoordinate=(stop:Stop):RouteCoordinate|undefined=>{
  const key=stop.optionId??stop.ko;
  return coordinateFor(key) ?? routeCoordinates[key];
};
export const getLegMinutes=(stop:Stop)=>{
  const option=stop.optionId?allOptions.find(item=>item.id===stop.optionId):undefined;
  if(option) return option.transferMinutes;
  if(stop.ko==="서울역") return 25;
  if(stop.ko==="신경주역") return 125;
  if(stop.ko==="황리단길") return 35;
  if(stop.ko==="경주 숙소") return 10;
  return 15;
};

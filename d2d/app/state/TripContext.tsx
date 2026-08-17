"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LANGS, makeT, makeTf, loc, locField, type Lang } from "../i18n";
import { deepLinks } from "../lib/deeplinks";
import type { Ride, Tab, PlannerStage, MapScale, BuildMapScope, Stop, JourneyCategory, JourneyOption } from "../lib/types";
import { transport, initialStops, journeyCategories, samplePlans, sampleDays, mapData, originLocations, originRegionGroups, destinationRegions, requestExamples, type OriginCountry } from "../data/journey";
import { placeProvider } from "../lib/place-provider";
import { coverageOf, cityIdFromKorean } from "../data/places";
import { buildCostLines, totals, type CostLineId } from "../lib/cost-model";
import { generatePlans, type GeneratedPlan } from "../lib/plan-generator";
import { nightsBetween, type AgeBand, type Theme } from "../components/TripSetup";
import { defaultItinerary, type HomeAirportMode, type JourneyLeg } from "../data/journey-legs";
import type { TransferMode } from "../data/airport-transfer";
import { routeCoordinates, getRouteCoordinate, getLegMinutes, type RouteCoordinate } from "../data/route-coordinates";
import { formatWon, formatDuration, formatDurationFor } from "../lib/format";

const QUICK_START_KEYS = ["quick_first_family_trip","quick_beauty_shopping","quick_regional_heritage"] as const;


/**
 * One container for the whole trip screen.
 *
 * Why context-of-useState rather than a reducer: these are independent scalar
 * UI values (which tab, which filter, which text box). A reducer would buy
 * nothing and would rewrite every call site. The thing that actually mattered
 * was getting the views OUT of Home() without threading 100+ props.
 *
 * The rule that fixes the original focus bug: a view component must be declared
 * at module top level, never inside another component. A component declared
 * inside a render gets a fresh identity on every parent update, so React
 * unmounts and remounts its entire subtree — which is why typing Hangul used to
 * lose focus mid-syllable.
 */
function useTripState() {
  const [lang,setLang]=useState<Lang>("en");
  const [ride,setRide]=useState<Ride>("transit");
  const [late,setLate]=useState(false);
  const [moving,setMoving]=useState(false);
  const [decision,setDecision]=useState<"extend"|"warning"|"booking"|null>(null);
  const [extension,setExtension]=useState<number|null>(null);
  const [tab,setTab]=useState<Tab>("live");
  const [mode,setMode]=useState("RAIL");
  const [stops,setStops]=useState<Stop[]>(initialStops);
  const [optionCategory,setOptionCategory]=useState<JourneyCategory>("all");
  const [selectedOptionIds,setSelectedOptionIds]=useState<string[]>([]);
  const [optionSearch,setOptionSearch]=useState("");
  const [maxOptionMinutes,setMaxOptionMinutes]=useState("all");
  const [freeOnly,setFreeOnly]=useState(false);
  const [easyOnly,setEasyOnly]=useState(false);
  const [dayCondition,setDayCondition]=useState<"hot"|"cold"|"rain"|"tired">("hot");
  const [dayLimitMinutes,setDayLimitMinutes]=useState(240);
  const [extraBudget,setExtraBudget]=useState(200000);
  const [submitted,setSubmitted]=useState(false);
  const [docOpen,setDocOpen]=useState<string|null>(null);
  useEffect(()=>{
    const entry=LANGS.find(l=>l.id===lang);
    if(entry) document.documentElement.lang=entry.html;
  },[lang]);
  const [plannerStage,setPlannerStage]=useState<PlannerStage>("input");
  const [origin,setOrigin]=useState("Hyderabad, India");
  const [destinationInput,setDestinationInput]=useState("");
  const [destinations,setDestinations]=useState<string[]>([]);
  /**
   * The five answers the whole plan is built from.
   *
   * They live here rather than inside the setup screen because everything
   * downstream reads them: how many cities fit, what a night costs per person,
   * which transport a leg can even use.
   */
  const [departDate,setDepartDate]=useState("");
  const [returnDate,setReturnDate]=useState("");
  const [party,setParty]=useState(2);
  const [ages,setAges]=useState<Record<AgeBand,number>>({child:0,teen:0,adult:2,senior:0});
  const [budget,setBudget]=useState<number|null>(null);
  const [themes,setThemes]=useState<Theme[]>([]);
  const toggleTheme=(th:Theme)=>setThemes(prev=>prev.includes(th)?prev.filter(x=>x!==th):[...prev,th]);
  const [setupDone,setSetupDone]=useState(false);
  const setAge=(band:AgeBand,n:number)=>setAges(prev=>({...prev,[band]:n}));
  const tripNights=nightsBetween(departDate,returnDate);
  /** Which transport the traveler picked for each movement, keyed by leg index. */
  const [legTransport,setLegTransport]=useState<Record<number,string>>({});
  const setLegMode=(i:number,mode:string)=>setLegTransport(prev=>({...prev,[i]:mode}));
  /**
   * The two flight times, and the mode chosen for each step of the chain.
   *
   * These live here and not in the chain component because the chain is
   * DERIVED — rebuilt from scratch whenever a time changes. Anything the
   * traveler typed would be lost on the next keystroke if it lived inside it.
   */
  const [arrivalTime,setArrivalTime]=useState<number|null>(null);
  const [departureTime,setDepartureTime]=useState<number|null>(null);
  const [chainMoves,setChainMoves]=useState<Record<string,string>>({});
  const setChainMove=(nodeId:string,mode:string)=>setChainMoves(prev=>({...prev,[nodeId]:mode}));
  /**
   * Places added from inside the trip — the hotel-lobby-at-19:40 case.
   *
   * Keyed by day number so they land in the right place in the chain. There is
   * deliberately no second "actual itinerary" here: improvising is editing the
   * plan, not abandoning it, so there is nothing to reconcile later.
   */
  const [addedByDay,setAddedByDay]=useState<Record<number,JourneyOption[]>>({});
  /** Which day of the trip today is. Derived from the dates, never asked. */
  const todayIndex=useMemo(()=>{
    const start=Date.parse(departDate);
    if(!Number.isFinite(start)) return 1;
    const now=new Date();
    const midnight=Date.parse(`${now.toISOString().slice(0,10)}`);
    const n=Math.floor((midnight-start)/86_400_000)+1;
    return Math.min(Math.max(1,n),Math.max(1,tripNights+1));
  },[departDate,tripNights]);
  const addToToday=(o:JourneyOption)=>setAddedByDay(prev=>({
    ...prev,
    [todayIndex]:[...(prev[todayIndex]??[]).filter(x=>x.id!==o.id),o],
  }));
  const [stayStrategy,setStayStrategy]=useState("split");
  const [purposes,setPurposes]=useState(["culture","food"]);
  const [selectedPlan,setSelectedPlan]=useState(0);
  const [selectedDay,setSelectedDay]=useState(0);
  const [mapScale,setMapScale]=useState<MapScale>("korea");
  const [buildMapScope,setBuildMapScope]=useState<BuildMapScope>("korea");
  const [requestText,setRequestText]=useState("");
  const [inputAnalyzed,setInputAnalyzed]=useState(false);
  const [showDetails,setShowDetails]=useState(false);
  const [locationStatus,setLocationStatus]=useState<"idle"|"loading"|"error">("idle");
  const [originChoice,setOriginChoice]=useState<"ask"|"current"|"manual">("ask");
  const [originCountry,setOriginCountry]=useState<OriginCountry>("india");
  const [originCity,setOriginCity]=useState("hyderabad");
  const [originArea,setOriginArea]=useState("Financial District");
  const [detailAddress,setDetailAddress]=useState("");
  const [originRegion,setOriginRegion]=useState("all");
  const [originCountryQuery,setOriginCountryQuery]=useState("");
  const [activeRegion,setActiveRegion]=useState("all");
  const [destinationQuery,setDestinationQuery]=useState("");
  const t=makeT(lang);
  const tf=makeTf(lang);
  const durationText=(minutes:number)=>formatDurationFor(lang,minutes);
  const rides=useMemo(()=>[
    {id:"transit" as const,title:t("copy_transit"),meta:t("copy_transit_meta"),mark:"01"},{id:"taxi" as const,title:t("copy_taxi"),meta:t("copy_taxi_meta"),mark:"02"},{id:"drive" as const,title:t("copy_drive"),meta:t("copy_drive_meta"),mark:"03"},
  ],[t]);
  const selectedPlanData=samplePlans[selectedPlan];
  /** Days come from the generated plan; the fixtures are the fallback for an
   *  empty selection, not the source. */
  const selectedDayData=sampleDays[selectedDay];
  const selectedMapNodes=mapData[mapScale];
  const selectedCountryData=originLocations[originCountry];
  const selectedCityData=selectedCountryData.cities.find(city=>city.id===originCity)??selectedCountryData.cities[0];
  const visibleOriginCountries=(Object.keys(originLocations) as OriginCountry[]).filter(id=>{
    const region=originRegionGroups.find(group=>group.id===originRegion);
    const matchesRegion=originRegion==="all"||Boolean(region?.countries.includes(id));
    const query=originCountryQuery.trim().toLowerCase();
    const matchesQuery=!query||`${originLocations[id].ko} ${originLocations[id].en}`.toLowerCase().includes(query);
    return id===originCountry||(matchesRegion&&matchesQuery);
  });
  const visibleDestinationRegions=destinationRegions.map(region=>({...region,cities:region.cities.filter(city=>city.includes(destinationQuery.trim()))})).filter(region=>(activeRegion==="all"||region.id===activeRegion)&&region.cities.length);
  // Options are scoped to the cities the traveler actually chose. A city we have
  // no data for is reported, never filled in with another city's places.
  /**
   * Plans built from the traveler's own cities, replacing the ten fixtures.
   *
   * Nights default to one per city plus one, which is what a first trip
   * actually looks like; the traveler adjusts the itinerary directly in BUILD.
   */
  const generatedPlans=useMemo<GeneratedPlan[]>(
    ()=>generatePlans(destinations,tripNights>0?tripNights:Math.max(2,destinations.length+1)),
    [destinations,tripNights],
  );
  const selectedGeneratedPlan=generatedPlans[selectedPlan]??generatedPlans[0];

  const placeResult=useMemo(()=>placeProvider.getOptions({cities:destinations}) as {options:typeof initialStops extends never?never:any[];missing:string[]},[destinations]);
  const journeyOptions=placeResult.options as import("../lib/types").JourneyOption[];
  const citiesMissingData=placeResult.missing;
  const destinationCoverage=destinations.map(name=>({name,coverage:coverageOf(cityIdFromKorean(name))}));

  const routeAddedTime=stops.reduce((sum,stop)=>sum+(stop.minutes??0),0);
  const routeAddedCost=stops.reduce((sum,stop)=>sum+(stop.cost??0),0);
  const selectedJourneyOptions=journeyOptions.filter(option=>selectedOptionIds.includes(option.id)&&!stops.some(stop=>stop.optionId===option.id));
  const selectionTime=selectedJourneyOptions.reduce((sum,option)=>sum+option.stayMinutes+option.transferMinutes,0);
  const selectionCost=selectedJourneyOptions.reduce((sum,option)=>sum+option.cost,0);
  const projectedTime=routeAddedTime+selectionTime;
  const projectedCost=routeAddedCost+selectionCost;
  const timeRemaining=dayLimitMinutes-projectedTime;
  const budgetRemaining=extraBudget-projectedCost;
  const filteredJourneyOptions=journeyOptions.filter(option=>{
    const query=optionSearch.trim().toLowerCase();
    const matchesQuery=!query||`${option.ko} ${option.en} ${option.zoneKo} ${option.zoneEn}`.toLowerCase().includes(query);
    const matchesCategory=optionCategory==="all"||option.category===optionCategory;
    const matchesTime=maxOptionMinutes==="all"||option.stayMinutes+option.transferMinutes<=Number(maxOptionMinutes);
    const matchesCondition=option.category!=="comfort"||optionCategory==="comfort"||option.condition===dayCondition;
    return matchesQuery&&matchesCategory&&matchesTime&&matchesCondition&&(!freeOnly||option.cost===0)&&(!easyOnly||option.walk==="low");
  });
  /**
   * The door legs are the traveler's to answer — we cannot guess the distance
   * from their house to their airport, or what parking costs there.
   */
  const [homeAirportMode,setHomeAirportMode]=useState<HomeAirportMode|null>(null);
  const [parkingPerDay,setParkingPerDay]=useState<number|null>(null);
  /** The journey is a list the traveler edits, not a fixed seven. */
  const [itinerary,setItinerary]=useState<JourneyLeg[]>(()=>defaultItinerary());
  const [transferMode,setTransferMode]=useState<TransferMode|null>(null);
  const [sameOnReturn,setSameOnReturn]=useState(true);
  /** Amounts the traveler supplied for legs we refuse to guess. */
  const [legAmounts,setLegAmounts]=useState<Partial<Record<CostLineId,number>>>({});
  const setLegAmount=(id:CostLineId,value:number|null)=>setLegAmounts(prev=>{
    const next={...prev};
    if(value===null) delete next[id]; else next[id]=value;
    // the return leg mirrors the outbound one unless the traveler unticks it
    if(sameOnReturn&&id==="home-to-airport"){
      if(value===null) delete next["airport-to-home"]; else next["airport-to-home"]=value;
    }
    return next;
  });

  /**
   * The full door-to-door budget. The sample plan supplies the Korea-side
   * numbers; the two door legs stay null until the traveler tells us how they
   * reach their own airport. A null renders as "아직 추정하지 않음", never as ₩0.
   */
  const costLines=useMemo(()=>buildCostLines({
    party:4,
    departISO:"2026-10-10",
    returnISO:"2026-10-17",
    homeAirportMode,
    parkingPerDay,
    korea:{
      ...legAmounts,
      /**
       * Nothing here is invented any more.
       *
       * These lines used to be read off a fixture — ₩3,200,000 of air,
       * ₩1,920,000 of stays — for a trip nobody had priced. The only figure we
       * can honestly supply is what the selected places actually publish, and
       * for freshly ingested cities that is nothing. Every other line stays
       * `undefined`, which the cost model renders as "아직 추정하지 않음"
       * rather than as a number.
       */
      "experiences":selectedGeneratedPlan?.known || undefined,
    } as Partial<Record<CostLineId,number>>,
  }),[selectedPlanData,homeAirportMode,parkingPerDay,legAmounts]);

  const costTotals=useMemo(()=>totals(costLines),[costLines]);
  const costMax=Math.max(1,...costLines.map(l=>l.amount??0));

  const addDestination=()=>{
    const value=destinationInput.trim();
    if(!value||destinations.includes(value)) return;
    setDestinations([...destinations,value]); setDestinationInput("");
  };
  const composeOrigin=(country:OriginCountry,cityId:string,area:string,detail:string)=>{
    const countryData=originLocations[country];
    const cityData=countryData.cities.find(city=>city.id===cityId)??countryData.cities[0];
    return [detail.trim(),area,loc(lang, cityData),loc(lang, countryData)].filter(Boolean).join(", ");
  };
  const changeOriginCountry=(country:OriginCountry)=>{
    const city=originLocations[country].cities[0];
    const area=city.areas[0];
    setOriginCountry(country);setOriginCity(city.id);setOriginArea(area);setDetailAddress("");
    setOrigin(composeOrigin(country,city.id,area,""));
  };
  const changeOriginCity=(cityId:string)=>{
    const city=selectedCountryData.cities.find(item=>item.id===cityId)??selectedCountryData.cities[0];
    const area=city.areas[0];
    setOriginCity(city.id);setOriginArea(area);setDetailAddress("");
    setOrigin(composeOrigin(originCountry,city.id,area,""));
  };
  const changeOriginArea=(area:string)=>{setOriginArea(area);setOrigin(composeOrigin(originCountry,originCity,area,detailAddress));};
  const changeDetailAddress=(detail:string)=>{setDetailAddress(detail);setOrigin(composeOrigin(originCountry,originCity,originArea,detail));};
  const toggleDestination=(place:string)=>setDestinations(destinations.includes(place)?destinations.filter(x=>x!==place):[...destinations,place]);
  const togglePurpose=(id:string)=>setPurposes(purposes.includes(id)?purposes.filter(x=>x!==id):[...purposes,id]);
  const analyzeRequest=(source=requestText)=>{
    const text=source.trim();
    if(!text) return;
    const cityAliases:[string,RegExp][]=[
      ["서울",/서울|seoul/i],["경주",/경주|gyeongju/i],["부산",/부산|busan/i],["제주",/제주|jeju/i],["인천",/인천|incheon/i],
      ["수원",/수원|suwon/i],["전주",/전주|jeonju/i],["강릉",/강릉|gangneung/i],["용인",/용인|yongin|에버랜드/i],
    ];
    const foundCities=cityAliases.filter(([,pattern])=>pattern.test(text)).map(([city])=>city);
    if(foundCities.length) setDestinations(foundCities);
    if(/하이데라바드|hyderabad/i.test(text)) setOrigin("Hyderabad, India");
    else if(/대구|daegu/i.test(text)) setOrigin("Daegu, Korea");
    else if(/현재\s*위치|내\s*위치|from here/i.test(text)) setOrigin(t("current_location"));
    if(/도착[^.]{0,15}바로|즉시\s*지방|direct.{0,12}region/i.test(text)) setStayStrategy("direct");
    else if(/한\s*곳|서울.{0,10}(고정|숙소)|숙소.{0,10}서울|one\s+(hotel|stay)/i.test(text)) setStayStrategy("hub");
    else if(/지역별|지방.{0,10}숙소|숙소.{0,10}(이동|나눠)|split/i.test(text)) setStayStrategy("split");
    const purposeAliases:[string,RegExp][]=[
      ["beauty",/뷰티|미용|beauty/i],["medical",/의료|병원|시술|medical|hospital/i],["culture",/문화재|역사|고궁|heritage|history/i],
      ["sight",/관광지|관광|sightseeing/i],["theme",/테마파크|에버랜드|롯데월드|theme\s*park/i],["water",/워터파크|water\s*park/i],
      ["shopping",/쇼핑|shopping/i],["seoul",/서울\s*문화|seoul\s*culture/i],["food",/음식|맛집|카페|food|cafe/i],["mixed",/복합|골고루|mixed/i],
    ];
    const foundPurposes=purposeAliases.filter(([,pattern])=>pattern.test(text)).map(([id])=>id);
    if(foundPurposes.length) setPurposes(foundPurposes);
    setInputAnalyzed(true);
    setShowDetails(false);
  };
  const useCurrentLocation=()=>{
    if(typeof navigator==="undefined"||!navigator.geolocation){setLocationStatus("error");return;}
    setOriginChoice("current");setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      position=>{setOrigin(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);setLocationStatus("idle");setInputAnalyzed(true);},
      ()=>{setLocationStatus("error");setOriginChoice("manual");},
      {enableHighAccuracy:false,timeout:7000,maximumAge:300000},
    );
  };

  const moveStop=(index:number,delta:number)=>{
    const target=index+delta;
    if(target<0||target>=stops.length||stops[index].locked) return;
    const next=[...stops]; [next[index],next[target]]=[next[target],next[index]]; setStops(next);
  };
  const toggleLock=(id:number)=>setStops(stops.map(s=>s.id===id?{...s,locked:!s.locked}:s));
  const toggleJourneyOption=(id:string)=>{
    if(stops.some(stop=>stop.optionId===id)) return;
    setSelectedOptionIds(ids=>ids.includes(id)?ids.filter(item=>item!==id):[...ids,id]);
  };
  const addSelectedOptions=()=>{
    if(!selectedJourneyOptions.length) return;
    const next=[...stops];
    const hotelIndex=next.findIndex(stop=>stop.kind==="STAY");
    const additions:Stop[]=selectedJourneyOptions.map((option,index)=>({
      id:Date.now()+index,ko:option.ko,en:option.en,kind:option.kind,locked:false,optionId:option.id,
      minutes:option.stayMinutes+option.transferMinutes,cost:option.cost,
      metaKo:`이동 ${option.transferMinutes}분 + 체류 ${option.stayMinutes}분`,
      metaEn:`${option.transferMinutes} min travel + ${option.stayMinutes} min stay`,
    }));
    next.splice(hotelIndex<0?next.length:hotelIndex,0,...additions);
    setStops(next);setSelectedOptionIds([]);setSubmitted(false);
  };


  return {
    activeRegion,
    addDestination,
    addSelectedOptions,
    analyzeRequest,
    budgetRemaining,
    buildMapScope,
    changeDetailAddress,
    changeOriginArea,
    changeOriginCity,
    changeOriginCountry,
    citiesMissingData,
    composeOrigin,
    costLines,
    costMax,
    costTotals,
    dayCondition,
    dayLimitMinutes,
    decision,
    destinationCoverage,
    destinationInput,
    destinationQuery,
    destinations,
    detailAddress,
    docOpen,
    durationText,
    easyOnly,
    extension,
    extraBudget,
    filteredJourneyOptions,
    freeOnly,
    homeAirportMode,
    inputAnalyzed,
    itinerary,
    journeyOptions,
    lang,
    late,
    legAmounts,
    locationStatus,
    mapScale,
    maxOptionMinutes,
    mode,
    moveStop,
    moving,
    optionCategory,
    optionSearch,
    origin,
    originArea,
    originChoice,
    originCity,
    originCountry,
    originCountryQuery,
    originRegion,
    parkingPerDay,
    plannerStage,
    projectedCost,
    projectedTime,
    purposes,
    requestText,
    ride,
    rides,
    routeAddedCost,
    routeAddedTime,
    sameOnReturn,
    selectedCityData,
    selectedCountryData,
    selectedDay,
    selectedDayData,
    selectedJourneyOptions,
    selectedMapNodes,
    selectedOptionIds,
    ages,
    budget,
    departDate,
    generatedPlans,
    legTransport,
    party,
    returnDate,
    setAge,
    setBudget,
    setDepartDate,
    setLegMode,
    arrivalTime,setArrivalTime,
    departureTime,setDepartureTime,
    chainMoves,setChainMove,
    addedByDay,addToToday,todayIndex,
    setParty,
    setReturnDate,
    setSetupDone,
    themes,
    toggleTheme,
    setupDone,
    tripNights,
    selectedGeneratedPlan,
    selectedPlan,
    selectedPlanData,
    selectionCost,
    selectionTime,
    setActiveRegion,
    setBuildMapScope,
    setDayCondition,
    setDayLimitMinutes,
    setDecision,
    setDestinationInput,
    setDestinationQuery,
    setDestinations,
    setDetailAddress,
    setDocOpen,
    setEasyOnly,
    setExtension,
    setExtraBudget,
    setFreeOnly,
    setHomeAirportMode,
    setInputAnalyzed,
    setItinerary,
    setLang,
    setLate,
    setLegAmount,
    setLegAmounts,
    setLocationStatus,
    setMapScale,
    setMaxOptionMinutes,
    setMode,
    setMoving,
    setOptionCategory,
    setOptionSearch,
    setOrigin,
    setOriginArea,
    setOriginChoice,
    setOriginCity,
    setOriginCountry,
    setOriginCountryQuery,
    setOriginRegion,
    setParkingPerDay,
    setPlannerStage,
    setPurposes,
    setRequestText,
    setRide,
    setSameOnReturn,
    setSelectedDay,
    setSelectedOptionIds,
    setSelectedPlan,
    setShowDetails,
    setStayStrategy,
    setStops,
    setSubmitted,
    setTab,
    setTransferMode,
    showDetails,
    stayStrategy,
    stops,
    submitted,
    t,
    tab,
    tf,
    timeRemaining,
    toggleDestination,
    toggleJourneyOption,
    toggleLock,
    togglePurpose,
    transferMode,
    useCurrentLocation,
    visibleDestinationRegions,
    visibleOriginCountries,
  };
}

export type TripState = ReturnType<typeof useTripState>;

const TripContext = createContext<TripState | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const value = useTripState();
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip(): TripState {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip must be used inside <TripProvider>");
  return value;
}

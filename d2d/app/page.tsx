"use client";

import { TripProvider, useTrip } from "./state/TripContext";
import { Header } from "./views/Chrome";
import LiveView from "./views/LiveView";
import PlanView from "./views/PlanView";
import BuildView from "./views/BuildView";
import SavedView from "./views/SavedView";
import type { Tab } from "./lib/types";

/**
 * page.tsx is now only a shell: pick the active view, render the modals and the
 * bottom nav. All state lives in TripProvider, all screens are top-level
 * components. Nothing here is redeclared during a render.
 */
function AppShell() {
  const {
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
  } = useTrip();
  const activeView = tab==="plan" ? <PlanView/>
    : tab==="build" ? <BuildView/>
    : tab==="saved" ? <SavedView/>
    : <LiveView/>;

  return <main className="site-shell"><Header/>{activeView}
    {decision&&<div className="decision-backdrop" role="presentation"><section className={`decision-sheet ${decision==="warning"?"danger":""}`} role="dialog" aria-modal="true" aria-label={t("journey_decision")}>
      <button className="sheet-close" onClick={()=>setDecision(null)} aria-label="Close">×</button>
      {decision==="extend"&&<><span>EXTEND THIS STOP</span><h2>{t("how_much_longer_would_you_like_to")}</h2><p>{t("we_ll_check_fixed_bookings_and_adjust")}</p><div className="duration-grid">{[15,30,60].map(m=><button key={m} onClick={()=>{setExtension(m);setDecision("warning")}}><strong>{m}</strong><span>{t("min")}</span></button>)}<button onClick={()=>{setExtension(90);setDecision("warning")}}><strong>+</strong><span>{t("custom")}</span></button></div></>}
      {decision==="warning"&&<><span>FIXED BOOKING AT RISK</span><h2>{t("leave_now_to_keep_your_current_booking")}</h2><p>{tf("extend_0_ktx_warning",extension??0)}</p><div className="impact-list"><div><span>{t("current_booking")}</span><strong>{t("at_risk")}</strong></div><div><span>{t("next_train_seats")}</span><strong>{t("check_required")}</strong></div><div><span>{t("remaining_journey")}</span><strong>{t("replan_after_approval")}</strong></div></div><div className="sheet-actions"><button className="sheet-primary" onClick={()=>{setMoving(true);setDecision(null)}}>{t("leave_now")}</button><button onClick={()=>setDecision("booking")}>{t("check_next_train")}</button></div></>}
      {decision==="booking"&&<><span>BOOKING HANDOFF</span><h2>{t("check_availability_with_the_official_provider")}</h2><p>{t("at_this_stage_door_to_door_hands")}</p><div className="booking-levels"><b>L0</b><span>{t("open_official_or_affiliate_booking")}</span><b>L3</b><span>{t("in_app_payment_after_partner_approval")}</span><b>L4</b><span>{t("explicit_approval_after_seats_fee_and_refund")}</span></div><div className="sheet-actions"><button className="sheet-primary" onClick={()=>setDecision("warning")}>{t("continue_to_provider")}</button><button onClick={()=>setDecision(null)}>{t("keep_original_plan")}</button></div></>}
    </section></div>}
    {docOpen&&<div className="decision-backdrop" role="presentation"><section className="decision-sheet document-sheet" role="dialog" aria-modal="true" aria-label={t("travel_document")}><button className="sheet-close" onClick={()=>setDocOpen(null)} aria-label="Close">×</button><span>TRIP WALLET · OFFLINE COPY</span><h2>{docOpen==="ktx"?(t("ktx_rail_ticket")):docOpen==="hotel"?(t("stay_voucher_2")):docOpen==="entry"?(t("visa_and_entry_document_copies")):(t("international_return_booking"))}</h2><div className="document-preview"><div className="document-code">{docOpen==="ktx"?"KTX\n08:30":docOpen==="hotel"?"STAY\n18:00":docOpen==="entry"?"ID\nCOPY":"AIR\nPNR"}</div><div><strong>{docOpen==="ktx"?(t("seoul_singyeongju")):docOpen==="hotel"?(t("check_in_details")):docOpen==="entry"?(t("protected_document_bundle")):(t("return_itinerary_and_e_ticket"))}</strong><p>{t("prototype_example_no_real_qr_booking_number")}</p></div></div><div className="copy-warning">{t("copies_do_not_replace_an_original_passport")}</div><div className="sheet-actions"><button className="sheet-primary" onClick={()=>setDocOpen(null)}>{t("done")}</button><button>{t("show_large_in_local_language")}</button></div></section></div>}
    <nav className="bottom-nav" aria-label="Primary navigation">{(["live","plan","build","saved"] as Tab[]).map((id,i)=>{const labels=[["NOW",t("copy_nav_today")],["PLAN",t("copy_nav_plan")],["BUILD",t("copy_nav_build")],["SAVE",t("copy_nav_profile")]][i];return <button key={id} className={tab===id?"active":""} onClick={()=>{setTab(id);setDecision(null)}}><i>{labels[0]}</i><span>{labels[1]}</span></button>})}</nav></main>;
}

export default function Home() {
  return (
    <TripProvider>
      <AppShell />
    </TripProvider>
  );
}

"use client";

import { useTrip } from "../state/TripContext";
import { LANGS, loc, locField } from "../i18n";
import { transport, journeyCategories, samplePlans, sampleDays, originLocations, originRegionGroups, requestExamples } from "../data/journey";
import { formatWon } from "../lib/format";
import type { Tab, Stop, JourneyCategory, MapScale, PlannerStage } from "../lib/types";
import BuildRouteMap from "../components/BuildRouteMap";
import { OptionProvenance } from "../components/ProvenanceBadge";
import { ItineraryEditor } from "../components/ItineraryEditor";
import { TripSetup } from "../components/TripSetup";
import { RouteTransport } from "../components/RouteTransport";
import { DayChain } from "../components/DayChain";
import { ModePalette } from "./Chrome";

export default function BuildView() {
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
    setParty,
    setReturnDate,
    setSetupDone,
    themes,
    toggleTheme,
    setupDone,
    arrivalTime,setArrivalTime,departureTime,setDepartureTime,chainMoves,setChainMove,addedByDay,
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
  return <section className="workspace-view">
    <div className="workspace-hero build-hero"><span>ROUTE CREATOR</span><h1>{t("every_trip_is_a_set_of_choices")}</h1><p>{t("mix_sights_meals_shopping_experiences_and_rest")}</p></div>
    <div className="builder-grid">
      <div className="builder-main">
        <TripSetup lang={lang}
          origin={origin} onOrigin={setOrigin}
          destinations={destinations} onToggleDestination={toggleDestination}
          departDate={departDate} onDepartDate={setDepartDate}
          returnDate={returnDate} onReturnDate={setReturnDate}
          party={party} onParty={setParty}
          ages={ages} onAge={setAge}
          budget={budget} onBudget={setBudget}
          themes={themes} onToggleTheme={toggleTheme}
          onDone={()=>setSetupDone(true)}/>
        {/* The trip itself, before any of the machinery for editing it. */}
        {setupDone && <DayChain lang={lang} origin={origin} plan={generatedPlans[0]}
          departDate={departDate} themes={themes}
          arrival={arrivalTime} departure={departureTime}
          onArrival={setArrivalTime} onDeparture={setDepartureTime}
          moves={chainMoves} onMove={setChainMove} extras={addedByDay}/>}
        {setupDone && <RouteTransport lang={lang} plan={generatedPlans[0]} chosen={legTransport} onChoose={setLegMode}/>}
        {/* The leg-by-leg editor stays for the trips that genuinely need it —
            open-jaw, a ferry, a re-entry — but it is no longer the front door. */}
        {setupDone && <details className="advanced-itinerary"><summary>{t("edit_every_leg_by_hand")}</summary>
          <ItineraryEditor lang={lang} legs={itinerary} onChange={setItinerary} cities={destinations}/>
        </details>}
          <article className="panel route-panel">
          <div className="panel-head"><div><span>YOUR ROUTE</span><h2>{destinations.length ? destinations.join(" · ") : t("your_journey_home_to_home")}</h2></div><small>{stops.length} STOPS</small></div>
          <div className="stop-list">{stops.map((s,index)=><div className="stop-row" key={s.id}>
            <span className="stop-index">{String(index+1).padStart(2,"0")}</span>
            <div className="stop-name"><strong>{loc(lang, s)}</strong><small>{s.kind}{s.metaKo?` · ${locField(lang, s, "meta")}`:""}</small></div>
            <div className="stop-actions"><button aria-label="Move up" onClick={()=>moveStop(index,-1)}>↑</button><button aria-label="Move down" onClick={()=>moveStop(index,1)}>↓</button><button aria-label="Lock" className={s.locked?"locked":""} onClick={()=>toggleLock(s.id)}>{s.locked?"LOCK":"FREE"}</button>{!s.locked&&<button aria-label="Remove" onClick={()=>{setStops(stops.filter(x=>x.id!==s.id));setSubmitted(false)}}>×</button>}</div>
          </div>)}</div>
        </article>

        <BuildRouteMap stops={stops} lang={lang} mode={mode} scope={buildMapScope} onScopeChange={setBuildMapScope}/>

        <article className="panel option-lab">
          <div className="option-lab-head"><div><span>ADD TO THE JOURNEY</span><h2>{t("what_else_would_you_like_to_do")}</h2><p>{t("choose_multiple_options_travel_times_are_route")}</p></div><b>{selectedJourneyOptions.length} {t("selected_2")}</b></div>

          <div className="comfort-context">
            <div><span>CONTEXT CARE</span><strong>{dayCondition==="hot"?(t("on_hot_days_pause_before_you_get")):dayCondition==="cold"?(t("warm_up_with_korean_winter_snacks")):dayCondition==="rain"?(t("make_rainy_days_memorable_too")):(t("fatigue_belongs_in_the_plan"))}</strong><small>{dayCondition==="hot"?(t("a_20_minute_cold_drink_and_water")):dayCondition==="cold"?(t("seasonal_roasted_sweet_potato_hotteok_and_fish")):dayCondition==="rain"?(t("indoor_alternatives_such_as_tea_houses_and")):(t("a_20_minute_restroom_charging_and_seated"))}</small></div>
            <label><span>{t("today_s_condition")}</span><select value={dayCondition} onChange={event=>setDayCondition(event.target.value as "hot"|"cold"|"rain"|"tired")}><option value="hot">{t("hot_thirsty")}</option><option value="cold">{t("cold")}</option><option value="rain">{t("rain")}</option><option value="tired">{t("tired")}</option></select></label>
          </div>

          <div className="constraint-editor">
            <label><span>{t("time_available_today")}</span><select value={dayLimitMinutes} onChange={event=>setDayLimitMinutes(Number(event.target.value))}><option value={120}>{t("2_hours")}</option><option value={240}>{t("4_hours")}</option><option value={360}>{t("6_hours")}</option><option value={480}>{t("8_hours")}</option></select></label>
            <label><span>{t("extra_budget_4_people")}</span><select value={extraBudget} onChange={event=>setExtraBudget(Number(event.target.value))}><option value={50000}>₩50,000</option><option value={100000}>₩100,000</option><option value={200000}>₩200,000</option><option value={500000}>₩500,000</option></select></label>
            <div className="constraint-result"><span>{t("left_after_selection")}</span><strong className={timeRemaining<0?"over":""}>{timeRemaining<0?"−":""}{durationText(timeRemaining)}</strong><small>{budgetRemaining<0?"−":""}{formatWon(Math.abs(budgetRemaining))}</small></div>
          </div>

          <div className="option-toolbar">
            <input aria-label={t("search_activities")} value={optionSearch} onChange={event=>setOptionSearch(event.target.value)} placeholder={t("search_places_and_activities")}/>
            <select aria-label={t("duration_filter")} value={maxOptionMinutes} onChange={event=>setMaxOptionMinutes(event.target.value)}><option value="all">{t("any_duration")}</option><option value="60">{t("within_1_hour")}</option><option value="120">{t("within_2_hours")}</option><option value="180">{t("within_3_hours")}</option></select>
            <button className={freeOnly?"active":""} onClick={()=>setFreeOnly(!freeOnly)}>{t("free_only")}</button><button className={easyOnly?"active":""} onClick={()=>setEasyOnly(!easyOnly)}>{t("easy_walking")}</button>
          </div>
          <div className="option-categories">{journeyCategories.map(category=><button key={category.id} className={optionCategory===category.id?"active":""} onClick={()=>setOptionCategory(category.id)}>{loc(lang, category)}</button>)}</div>

          {destinations.length===0 && <div className="empty-state"><strong>{t("choose_a_korean_city_first")}</strong><p>{t("options_appear_once_you_pick_cities")}</p></div>}
          {citiesMissingData.length>0 && <div className="coverage-note"><b>{t("no_place_data_for_these_cities")}</b><span>{citiesMissingData.join(" · ")}</span><small>{t("we_would_rather_show_nothing_than_wrong")}</small></div>}
          <div className="option-grid">{filteredJourneyOptions.map(option=>{
            const added=stops.some(stop=>stop.optionId===option.id);
            const selected=selectedOptionIds.includes(option.id)&&!added;
            const totalMinutes=option.stayMinutes+option.transferMinutes;
            return <button key={option.id} className={`option-card ${selected?"selected":""} ${added?"added":""}`} onClick={()=>toggleJourneyOption(option.id)} disabled={added} aria-pressed={selected}>
              <div className="option-card-top"><span>{option.kind} · {locField(lang, option, "zone")}</span><b>{added?(t("added")):selected?"✓":"+"}</b></div>
              <h3>{loc(lang, option)}</h3>
              <div className="option-metrics"><span><b>{durationText(totalMinutes)}</b><small>{tf("travel_0_stay_1",option.transferMinutes,option.stayMinutes)}</small></span><span><b>{option.cost===0?(t("free")):formatWon(option.cost)}</b><small>{locField(lang, option, "cost")}</small></span></div>
              <div className="option-facts"><span>{locField(lang, option, "hours")}</span><small>{locField(lang, option, "source")}</small><OptionProvenance option={option} lang={lang}/></div>
              <div className="option-badges"><i>{option.walk==="low"?(t("easy")):option.walk==="medium"?(t("moderate_walk")):(t("more_walking"))}</i>{option.booking&&<i className="warn">{t("booking")}</i>}{option.night&&<i>{t("night")}</i>}</div>
            </button>;
          })}</div>
          {!filteredJourneyOptions.length&&<div className="option-empty">{t("no_options_match_try_removing_a_filter")}</div>}

          <div className={`option-impact ${timeRemaining<0||budgetRemaining<0?"risk":""}`}>
            <div><span>{timeRemaining<0||budgetRemaining<0?(t("limit_exceeded")):(t("combination_fits"))}</span><strong>{selectedJourneyOptions.length?`${selectedJourneyOptions.length}${t("options")}`:(t("choose_your_options"))}</strong><small>{tf("adds_0_1",durationText(selectionTime),formatWon(selectionCost))}</small></div>
            <p>{timeRemaining<0?(tf("short_by_0",durationText(timeRemaining))):budgetRemaining<0?(tf("over_budget_0",formatWon(Math.abs(budgetRemaining)))):(t("add_them_to_the_route_then_reorder"))}</p>
            <button onClick={addSelectedOptions} disabled={!selectedJourneyOptions.length}>{t("add_selected_options")} →</button>
          </div>
          <p className="data-separation-note">{t("data_note_official_labels_refer_to_public")}</p>
        </article>

        <article className="panel"><div className="panel-head"><div><span>MOVE BETWEEN STOPS</span><h2>{t("preferred_transport")}</h2></div><small>{mode}</small></div><ModePalette/></article>
      </div>
      <aside className="builder-side">
        <article className={`validation-card ${timeRemaining<0||budgetRemaining<0?"has-risk":""}`}><span>FEASIBILITY CHECK</span><h3>{timeRemaining<0||budgetRemaining<0?(t("this_combination_needs_trimming")):(t("fits_your_current_limits"))}</h3><p>{t("this_first_pass_uses_official_operation_facts")}</p><div className="validation-row"><span>{t("time_used")}</span><strong>{durationText(projectedTime)}</strong></div><div className="validation-row"><span>{t("budget_used")}</span><strong>{formatWon(projectedCost)}</strong></div><div className="validation-row"><span>{t("locked_stops")}</span><strong>{stops.filter(s=>s.locked).length}</strong></div><div className="validation-row"><span>{t("live_data")}</span><strong className="pending">PENDING</strong></div><button onClick={()=>setSubmitted(true)}>{submitted?(t("review_pending")):(t("request_validation"))}</button></article>
        <article className="cert-card"><span>ROUTE CERTIFICATION · PLANNED</span><h3>{t("great_routes_become_shared_assets")}</h3><p>{t("with_consent_and_anonymization_edits_and_real")}</p><ol><li><b>01</b><span>{t("community_tested")}</span></li><li><b>02</b><span>{t("locally_verified")}</span></li><li><b>03</b><span>{t("hankukin_certified")}</span></li></ol><div className="reward-note"><strong>{t("launch_reward")}</strong><span>{t("premium_time_extra_generations_and_creator_badge")}</span></div></article>
      </aside>
    </div>
  </section>;
}

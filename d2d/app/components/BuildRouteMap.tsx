"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeT, makeTf, loc, type Lang } from "../i18n";
import type { Stop, BuildMapScope } from "../lib/types";
import { getRouteCoordinate, getLegMinutes } from "../data/route-coordinates";
import { cityEntry } from "../data/places";
import { formatDurationFor } from "../lib/format";
import { ShowToDriver, DirectionLinks, type DriverTarget } from "./ShowToDriver";

export default function BuildRouteMap({stops,lang,mode,scope,onScopeChange}:{stops:Stop[];lang:Lang;mode:string;scope:BuildMapScope;onScopeChange:(scope:BuildMapScope)=>void}){
  const t=makeT(lang);
  const tf=makeTf(lang);
  const hostRef=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<import("leaflet").Map|null>(null);
  const routeLayerRef=useRef<import("leaflet").LayerGroup|null>(null);
  const [activeKey,setActiveKey]=useState<string|null>(null);
  const [driverTarget,setDriverTarget]=useState<DriverTarget|null>(null);
  /**
   * Every stop, with whatever coordinate we could resolve — including none.
   *
   * The old version filtered the unresolved ones away in the same expression
   * that built the list, so a route with three unmappable stops rendered as a
   * shorter route with no explanation. Keeping them separate lets the panel
   * say what is missing.
   */
  const resolved=useMemo(()=>stops.map((stop,index)=>({stop,index,coordinate:getRouteCoordinate(stop)})),[stops]);
  const placed=useMemo(()=>resolved.filter((i):i is typeof i & {coordinate:NonNullable<typeof i.coordinate>}=>Boolean(i.coordinate)),[resolved]);
  /**
   * The traveler's own door has no coordinate ON PURPOSE.
   *
   * HOME_ADDRESS_RULE keeps precise home addresses off any third-party map, so
   * the two door legs will never resolve — counting them as "missing data"
   * would report a privacy decision as a defect, and the number would never go
   * to zero however much place data we ingest.
   */
  const missing=resolved.filter(i=>!i.coordinate&&i.stop.kind!=="HOME"&&i.stop.kind!=="RETURN").length;

  /**
   * "City" scope means the city the route is actually in, whichever that is.
   * The first placed stop decides, because a route is normally built outward
   * from where the traveler starts.
   */
  const focusCity=placed[0]?.coordinate.city;
  const focusLabel=focusCity?(loc(lang,cityEntry(focusCity)??{ko:focusCity,en:focusCity})):t("city_2");
  const mappedStops=useMemo(
    ()=>scope==="korea"?placed:placed.filter(item=>item.coordinate.city===focusCity),
    [placed,scope,focusCity],
  );
  const routeMinutes=mappedStops.slice(1).reduce((sum,item)=>sum+getLegMinutes(item.stop),0);
  const modeLabel=mode==="TRANSIT"?(t("transit")):mode==="DRIVE"?(t("drive")):mode==="RENT"?(t("rental_car")):mode==="RAIL"?(t("rail_local_transit")):mode==="BUS"?(t("bus")):mode==="MIX"?(t("mixed_route")):(t("selected_transport"));

  useEffect(()=>{
    let cancelled=false;
    const renderMap=async()=>{
      const L=await import("leaflet");
      if(cancelled||!hostRef.current) return;
      if(!mapRef.current){
        mapRef.current=L.map(hostRef.current,{zoomControl:false,minZoom:5,maxZoom:18});
        L.control.zoom({position:"bottomright"}).addTo(mapRef.current);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',updateWhenIdle:true}).addTo(mapRef.current);
        routeLayerRef.current=L.layerGroup().addTo(mapRef.current);
      }
      const map=mapRef.current;
      const layer=routeLayerRef.current;
      if(!map||!layer) return;
      layer.clearLayers();
      const points=mappedStops.map(item=>[item.coordinate.lat,item.coordinate.lng] as [number,number]);
      if(points.length>1) L.polyline(points,{color:"#f36f4a",weight:5,opacity:.9,dashArray:mode==="RAIL"?"12 8":undefined,lineJoin:"round"}).addTo(layer);
      mappedStops.forEach(item=>{
        const key=item.stop.optionId??item.stop.ko;
        const marker=L.marker([item.coordinate.lat,item.coordinate.lng],{icon:L.divIcon({className:`route-map-pin ${activeKey===key?"active":""}`,html:`<span>${item.index+1}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(layer);
        marker.bindTooltip(`${item.index+1}. ${loc(lang, item.stop)}`,{direction:"top",offset:[0,-14],permanent:activeKey===key,opacity:.96});
        marker.on("click",()=>setActiveKey(key));
      });
      const active=mappedStops.find(item=>(item.stop.optionId??item.stop.ko)===activeKey);
      if(active) map.flyTo([active.coordinate.lat,active.coordinate.lng],scope==="korea"?8:15,{duration:.45});
      else if(points.length===1) map.setView(points[0],scope==="korea"?7:14);
      else if(points.length>1) map.fitBounds(L.latLngBounds(points),{padding:[38,38],maxZoom:scope==="korea"?8:14});
      // Nothing placed yet: show the country, not one city.
      else map.setView([36.5,127.85],7);
      window.setTimeout(()=>map.invalidateSize(),0);
    };
    void renderMap();
    return()=>{cancelled=true};
  },[mappedStops,activeKey,lang,mode,scope]);

  useEffect(()=>()=>{mapRef.current?.remove();mapRef.current=null},[]);

  return <article className="panel build-route-map-panel">
    <div className="build-map-head"><div><span>LIVE ROUTE MAP</span><h2>{t("see_the_route_as_you_build_it")}</h2><p>{t("markers_and_the_route_line_update_when")}</p></div><div className="build-map-scope"><button className={scope==="city"?"active":""} onClick={()=>{setActiveKey(null);onScopeChange("city")}} disabled={!focusCity}>{focusLabel}</button><button className={scope==="korea"?"active":""} onClick={()=>{setActiveKey(null);onScopeChange("korea")}}>{t("korea")}</button></div></div>
    <div className="build-map-layout">
      <div className="build-map-canvas"><div ref={hostRef} className="leaflet-route-map"/><div className="map-data-state"><b>{t("coordinate_map")}</b><span>{t("straight_line_preview_road_routing_api_pending")}</span></div></div>
      <div className="route-rundown"><div className="route-rundown-summary"><span>{scope==="city"?focusLabel:(t("full_route"))}</span><strong>{mappedStops.length} {t("stops")}</strong><small>{modeLabel} · {tf("moving_about_0",formatDurationFor(lang,routeMinutes))}</small><button onClick={()=>setActiveKey(null)}>{t("fit_full_route")}</button>{missing>0&&<em className="route-missing">{tf("0_stops_have_no_coordinates",missing)}</em>}</div><div className="route-rundown-list">{mappedStops.map((item,position)=>{
        const key=item.stop.optionId??item.stop.ko;
        const place=item.coordinate;
        const previous=position>0?mappedStops[position-1].coordinate:undefined;
        return <div key={`${key}-${item.index}`} className={`route-rundown-row ${activeKey===key?"active":""}`}>
          <button className="route-rundown-main" onClick={()=>setActiveKey(key)}><b>{String(item.index+1).padStart(2,"0")}</b><span><strong>{loc(lang, item.stop)}</strong><em className="place-hangul" lang="ko">{place.ko} · <i>{place.rm}</i></em><small>{position===0?t("map_start"):tf("about_0_from_previous",formatDurationFor(lang,getLegMinutes(item.stop)))}</small></span><i>{item.stop.kind}</i></button>
          <DirectionLinks from={previous} to={place} lang={lang} onShowDriver={setDriverTarget}/>
        </div>;
      })}</div></div>
    </div>
    <ShowToDriver target={driverTarget} lang={lang} onClose={()=>setDriverTarget(null)}/>
    <div className="build-map-note"><span>{t("this_map_uses_public_place_coordinates_and")}</span><b>{t("map_list_synced")}</b></div>
  </article>;
}

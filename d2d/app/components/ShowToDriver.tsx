"use client";

import { makeT, type Lang } from "../i18n";
import { deepLinks } from "../lib/deeplinks";
import type { RouteCoordinate } from "../data/route-coordinates";

export type DriverTarget = RouteCoordinate;

/**
 * The single biggest time sink for a foreign visitor in Korea is not a bad
 * itinerary — it is being unable to say where they want to go. This fills the
 * screen with the Korean name so it can simply be held up to a driver.
 *
 * The Hangul and romanization never change with the interface language.
 */
export function ShowToDriver({
  target,
  lang,
  onClose,
}: {
  target: DriverTarget | null;
  lang: Lang;
  onClose: () => void;
}) {
  if (!target) return null;
  const t = makeT(lang);
  return (
    <div className="driver-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="driver-card">
        <span className="driver-label">{t("show_this_to_a_driver")}</span>
        <strong className="driver-hangul" lang="ko">{target.ko}</strong>
        <span className="driver-roman">{target.rm}</span>
        <span className="driver-local">{lang === "ko" ? target.en : target.en}</span>
        <small className="driver-close">{t("tap_anywhere_to_close")}</small>
      </div>
    </div>
  );
}

/**
 * Directions are handed off, not computed. No API key, no cost, and no
 * responsibility for an arrival time we cannot guarantee.
 * Kakao and Naver are queried in Hangul because that is what they index well.
 */
export function DirectionLinks({
  from,
  to,
  lang,
  onShowDriver,
}: {
  from?: RouteCoordinate;
  to: RouteCoordinate;
  lang: Lang;
  onShowDriver: (target: DriverTarget) => void;
}) {
  const t = makeT(lang);
  const links = deepLinks(from, { hangul: to.ko, lat: to.lat, lng: to.lng });
  return (
    <div className="direction-links">
      <button type="button" className="driver-button" onClick={() => onShowDriver(to)}>
        {t("show_to_driver")}
      </button>
      <span className="direction-label">{t("directions")}</span>
      <a href={links.kakao} target="_blank" rel="noopener noreferrer">Kakao</a>
      <a href={links.naver} target="_blank" rel="noopener noreferrer">Naver</a>
      <a href={links.google} target="_blank" rel="noopener noreferrer">Google</a>
    </div>
  );
}

/**
 * Hand-off to the map app the traveler already uses.
 *
 * Door to Door deliberately does NOT compute road routes itself. The moment it
 * promises an arrival time it owns the accuracy of that promise, which needs a
 * paid routing API and continuous monitoring. Handing off costs nothing, has no
 * API key, and is what people actually do while walking.
 *
 * Kakao and Naver are queried with the HANGUL name on purpose — "Bulguksa
 * Temple" returns poor results, "불국사" is exact.
 *
 * TODO before shipping: verify each URL format against the provider's current
 * documentation. Naver's web directions format changes; place search is used
 * here because it is the stable surface.
 */

export type LatLng = { lat: number; lng: number };
export type DeepLinkTarget = { hangul: string } & LatLng;

export type DeepLinkSet = {
  kakao: string;
  naver: string;
  google: string;
};

export function deepLinks(from: LatLng | undefined, to: DeepLinkTarget): DeepLinkSet {
  const name = encodeURIComponent(to.hangul);
  const origin = from ? `${from.lat},${from.lng}` : "";
  return {
    kakao: `https://map.kakao.com/link/to/${name},${to.lat},${to.lng}`,
    naver: `https://map.naver.com/p/search/${name}`,
    google:
      `https://www.google.com/maps/dir/?api=1` +
      (origin ? `&origin=${origin}` : "") +
      `&destination=${to.lat},${to.lng}&travelmode=transit`,
  };
}

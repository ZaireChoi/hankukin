"use client";

import { useEffect, useState } from "react";
import { makeT, type Lang } from "../i18n";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * "Download it from the homepage" without an app store.
 *
 * The browser fires beforeinstallprompt only when the app is installable
 * (manifest + service worker + served over HTTPS). We hold onto that event and
 * show our own button, so the invitation appears where the traveler already is.
 *
 * No store review, no 15–30% store commission, no second codebase — and the
 * page stays a normal indexable URL, which an app in a store never is.
 */
export default function InstallApp({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is a bonus, never a requirement */
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !promptEvent) return null;

  return (
    <button
      type="button"
      className="install-cta"
      onClick={async () => {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setPromptEvent(null);
      }}
    >
      {t("install_app")}
    </button>
  );
}

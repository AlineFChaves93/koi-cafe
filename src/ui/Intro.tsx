import { useEffect, useState } from "react";
import { makeT, type Lang } from "@/game/i18n";

export function Intro({ lang }: { lang: Lang }) {
  const [intro, setIntro] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const t = makeT(lang);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("autostart")) {
      const timer = window.setTimeout(() => setIntro(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  if (!intro) return null;

  const begin = () => {
    setLeaving(true);
    window.setTimeout(() => setIntro(false), 450);
  };

  return (
    <div className={`intro ${leaving ? "leaving" : ""}`}>
      <div className="intro-art" aria-hidden />
      <div className="intro-panel">
        <small>CARP CAFÉ</small>
        <h1>Koi Café</h1>
        <p>
          {t("intro.text")}
        </p>
        <button onClick={begin}>{t("intro.cta")}</button>
      </div>
    </div>
  );
}

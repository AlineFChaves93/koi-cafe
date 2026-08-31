import { useEffect, useState } from "react";

export function Intro() {
  const [intro, setIntro] = useState(true);
  const [leaving, setLeaving] = useState(false);

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
      <div className="intro-art" aria-hidden>
        <img className="ia-koi ia-koi-a" src="/assets/koi/koi-hero.png" alt="" draggable={false} />
        <img className="ia-koi ia-koi-b" src="/assets/koi/koi-hero.png" alt="" draggable={false} />
        <img className="ia-koi ia-koi-c" src="/assets/koi/koi-hero.png" alt="" draggable={false} />
        <img className="ia-koi ia-koi-d" src="/assets/koi/koi-hero.png" alt="" draggable={false} />
        <img className="ia-boy" src="/assets/character/boy-idle.png" alt="" draggable={false} />
      </div>
      <div className="intro-panel">
        <small>CARP CAFÉ</small>
        <h1>Koi Café</h1>
        <p>
          Mire perto de um peixe para alimentar só ele: 3 jogadas e ele vira MÉDIO, 10 e vira ADULTO — vendido
          por ◎10. Jogar na água aberta alimenta o cardume (+4 jogadas). Cada espécie que chega a ADULTO entra
          na sua coleção e libera novas peças na Loja do Lago: ponte, samambaia, fonte de bambu e mais!
        </p>
        <button onClick={begin}>TOCAR PARA COMEÇAR</button>
        <span>Sample de gameplay • venda de peixes, remédios, ração premium e cenário completo</span>
      </div>
    </div>
  );
}

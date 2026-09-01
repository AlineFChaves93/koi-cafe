import Phaser from "phaser";
import { BoyView } from "../entities/BoyView";
import { DriftCoinView } from "../entities/DriftCoinView";
import { KoiView } from "../entities/KoiView";
import { PelletView } from "../entities/PelletView";
import { SceneryPiece } from "../entities/SceneryPiece";
import { WaterLayer } from "../entities/WaterLayer";
import { spawnCoinFountain, spawnSplash } from "../entities/effects";
import { FISH_OFFERS, fishRequirementProgress, sellPriceFor } from "../data/fishShop";
import { STAGE_ADULTO, STAGE_MEDIO } from "../data/economy";
import { SCENERY } from "../data/scenery";
import { KOI_VARIANTS } from "../data/variants";
import { gameBus } from "../events";
import { makeT, stageName, variantName } from "../i18n";
import { gameState } from "../state/GameState";
import { registerActions } from "../systems/actions";
import { stepDriftCoin } from "../systems/driftCoin";
import { fishName, progText, stageOf } from "../systems/economy";
import { createWorld, spawnSchool, stepFishSim } from "../systems/fishSim";
import type { Fish, FishView, SimEvent, SimWorld } from "../types";
import { TAU } from "../types";
import { PELLET_TEXTURES } from "./BootScene";

const fishViewsOf = (world: SimWorld): FishView[] =>
  world.fishes.map((f) => ({ fid: f.fid, variant: f.variant, progress: f.progress, sick: f.sick }));

export class PondScene extends Phaser.Scene {
  private world!: SimWorld;
  private water!: WaterLayer;
  private boy!: BoyView;
  private fishViews = new Map<number, KoiView>();
  private pelletViews = new Map<number, PelletView>();
  private driftCoinView: DriftCoinView | null = null;
  private coinHintShown = false;
  private sceneryPieces = new Map<string, SceneryPiece>();
  private overlay!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private labelBg!: Phaser.GameObjects.Graphics;
  private disposers: Array<() => void> = [];

  constructor() {
    super("Pond");
  }

  create(): void {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.world = createWorld(reduced);

    this.water = new WaterLayer(this, reduced);
    this.boy = new BoyView(this);
    this.applyLayout();

    const fullPreview = new URLSearchParams(window.location.search).has("cenacompleta");
    const { fishes } = gameState.initialize(window.localStorage, { fullPreview });
    spawnSchool(this.world, fishes.length ? fishes : undefined);
    gameState.registerFishSerializer(() =>
      this.world.fishes.map((f) => ({
        variant: f.variant,
        progress: Math.round(f.progress * 10) / 10,
        sick: f.sick,
      })),
    );

    this.rebuildScenery(gameState.getSnapshot().bought, { recreate: true });

    this.overlay = this.add.graphics().setDepth(29);
    this.labelBg = this.add.graphics().setDepth(30);
    this.label = this.add
      .text(0, 0, "", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#f4ead7",
      })
      .setDepth(31)
      .setVisible(false);

    // menino senta virado para o lado em que a ração vai cair
    this.disposers.push(
      gameBus.commands.on("aim:move", ({ x }) => this.boy.setSide(x < 45 ? "left" : "right")),
    );
    this.disposers.push(
      gameBus.events.on("feed:thrown", ({ xPct, yPct, premium }) => {
        const targetX = (xPct / 100) * this.world.w;
        const targetY = (yPct / 100) * this.world.h;
        this.boy.startThrow();
        this.animateFeedThrow(targetX, targetY, premium);
      }),
    );
    // mamadeira lançada pelo botão central: o menino arremessa e ela voa
    // até o peixe doente mais próximo do ponto em que o jogador soltou.
    this.disposers.push(
      gameBus.events.on("remedy:thrown", ({ fid, x, y }) => {
        this.boy.startThrow();
        const start = this.boy.getThrowOrigin();
        const flyer = this.add.image(start.x, start.y, "icon-remedio").setDepth(32).setScale(0.55);
        this.tweens.add({
          targets: flyer,
          duration: 640,
          ease: "Sine.easeIn",
          onUpdate: (tw) => {
            const p = tw.progress;
            flyer.x = start.x + (x - start.x) * p;
            flyer.y = start.y + (y - start.y) * p - Math.sin(p * Math.PI) * this.world.h * 0.14;
          },
          onComplete: () => {
            flyer.destroy();
            spawnSplash(this, x, y, true);
            gameBus.commands.emit("medicate-fish", { fid });
          },
        });
      }),
    );
    this.disposers.push(
      gameBus.events.on("scenery:changed", ({ bought }) => this.rebuildScenery(bought)),
    );
    this.disposers.push(
      gameBus.events.on("fish:sold", ({ x, y, amount }) => spawnCoinFountain(this, x, y, amount)),
    );
    this.disposers.push(
      gameBus.events.on("fish:bought", ({ x, y }) => spawnSplash(this, x, y, true)),
    );
    // moeda da correnteza resgatada: mesma fonte de moedas da venda + pop da view
    this.disposers.push(
      gameBus.events.on("coin:collected", ({ x, y, amount }) => {
        spawnCoinFountain(this, x, y, amount);
        this.retireDriftCoinView("collect");
      }),
    );
    // mamadeira aplicada: símbolo de curado (✓ verde) sobe do peixe e some
    this.disposers.push(
      gameBus.events.on("fish:cured", ({ fid }) => {
        const fish = this.world.fishes.find((f) => f.fid === fid);
        if (fish) this.showCuredFx(fish.x, fish.y, fish.len);
      }),
    );
    this.disposers.push(
      registerActions({
        world: this.world,
        state: gameState,
        schedule: (delay, callback) => {
          this.time.addEvent({ delay, callback });
        },
      }),
    );

    // debug hooks: dirige a simulação manualmente (cheques automatizados e
    // ambientes com requestAnimationFrame suspenso)
    (window as unknown as { __koiFish?: () => unknown }).__koiFish = () =>
      this.world.fishes.map((f) => ({
        fid: f.fid, x: f.x, y: f.y, heading: f.heading, len: f.len,
        anim: f.anim, variant: f.variant, progress: f.progress,
        stage: stageOf(f.progress), sick: f.sick,
      }));
    (window as unknown as { __koiStep?: (dt: number) => void }).__koiStep = (dt: number) =>
      stepFishSim(this.world, dt, performance.now());
    // um quadro completo (update + render) sem depender de rAF — para
    // ambientes com o loop suspenso (aba em segundo plano, cheques visuais)
    (window as unknown as { __koiFrame?: () => void }).__koiFrame = () => {
      const loop = this.game.loop;
      // loop parado deixa o callback solto; religa com o step do próprio jogo
      if (typeof loop.callback !== "function") {
        loop.callback = this.game.step.bind(this.game);
      }
      loop.tick();
    };
    (window as unknown as { __koiBoy?: () => unknown }).__koiBoy = () => this.boy.pose;
    (window as unknown as { __koiCoin?: () => unknown }).__koiCoin = () =>
      this.world.driftCoin ? { ...this.world.driftCoin } : null;

    gameBus.events.emit("fishes:changed", { fishes: fishViewsOf(this.world) });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    if (dt > 0) {
      stepFishSim(this.world, dt, time);
      stepDriftCoin(this.world, dt, gameState.getSnapshot().coins);
    }
    this.drainSimEvents();
    this.syncFishViews();
    this.syncPelletViews(time);
    this.syncDriftCoinView(time);
    if (!this.world.reduced) this.water.update(time, this.world.w, this.world.h);
    this.drawOverlay();
  }

  private applyLayout(): void {
    const W = this.scale.gameSize.width;
    const H = this.scale.gameSize.height;
    this.world.w = W;
    this.world.h = H;
    this.world.u = Math.min(W, H) / 900;
    this.water.layout(W, H);
    this.boy.layout(W, H);
    this.world.platform = { ...this.boy.platform };
  }

  private animateFeedThrow(targetX: number, targetY: number, premium: boolean): void {
    if (this.world.reduced) {
      spawnSplash(this, targetX, targetY, false);
      return;
    }

    const start = this.boy.getThrowOrigin();
    const count = premium ? 7 : 5;
    let remaining = count;

    for (let i = 0; i < count; i += 1) {
      const spread = i - (count - 1) / 2;
      const landingX = targetX + spread * 5;
      const landingY = targetY + ((i % 3) - 1) * 4;
      const grain = this.add
        .sprite(start.x + spread * 2, start.y, PELLET_TEXTURES[premium ? "premium" : "comum"])
        .setDepth(32)
        .setScale(0.78 + (i % 2) * 0.12);

      this.tweens.add({
        targets: grain,
        delay: i * 18,
        duration: 500 + i * 12,
        ease: "Sine.easeIn",
        angle: spread * 45,
        onUpdate: (tween) => {
          const progress = tween.progress;
          grain.x = start.x + spread * 2 + (landingX - start.x - spread * 2) * progress;
          grain.y = start.y + (landingY - start.y) * progress
            - Math.sin(progress * Math.PI) * this.world.h * (0.11 + (i % 2) * 0.015);
        },
        onComplete: () => {
          grain.destroy();
          remaining -= 1;
          if (remaining === 0) spawnSplash(this, targetX, targetY, false);
        },
      });
    }
  }

  // recreate = reconstrução total (boot, sem animação). Sem ele, faz
  // diff: destrói as removidas e cria só as novas — que ganham a revelação.
  private rebuildScenery(bought: string[], opts: { recreate?: boolean } = {}): void {
    if (opts.recreate) {
      for (const piece of this.sceneryPieces.values()) piece.destroy();
      this.sceneryPieces.clear();
    } else {
      for (const [id, piece] of this.sceneryPieces) {
        const keep = bought.includes(id);
        if (!keep) {
          piece.destroy();
          this.sceneryPieces.delete(id);
        }
      }
    }
    for (const item of SCENERY) {
      if (!bought.includes(item.id)) continue;
      if (this.sceneryPieces.has(item.id)) continue;
      this.sceneryPieces.set(
        item.id,
        new SceneryPiece(this, item, this.world.w, this.world.h, this.world.reduced, !opts.recreate),
      );
    }
  }

  private drainSimEvents(): void {
    const events = this.world.events;
    if (!events.length) return;
    this.world.events = [];
    for (const event of events) this.handleSimEvent(event);
  }

  private handleSimEvent(event: SimEvent): void {
    if (event.type === "fish:grew") {
      spawnSplash(this, event.x, event.y, true);
      const lang = gameState.getSnapshot().idioma;
      const t = makeT(lang);
      gameBus.events.emit("message", {
        text:
          event.stage === 2
            ? t("msg.grewAdult", {
                fish: fishName(event.variant, event.fid), stage: stageName(lang, 2), price: sellPriceFor(event.variant),
              })
            : t("msg.grewStage", { fish: fishName(event.variant, event.fid), stage: stageName(lang, event.stage) }),
      });
    } else if (event.type === "collection:unlocked") {
      const snap = gameState.getSnapshot();
      if (!snap.collection.includes(event.variant)) {
        const collection = [...snap.collection, event.variant];
        gameState.patch({ collection });
        // raças de colecionador (hoje só o Tancho) destravam quando a coleção
        // de espécies adultas atinge a meta da oferta na loja de peixes
        const newlyReady = FISH_OFFERS.filter((offer) => {
          if (offer.requirement?.kind !== "collection" || snap.fishUnlocked.includes(offer.variant)) return false;
          return fishRequirementProgress(offer.requirement, { ...snap, collection }, 0).met;
        });
        const lang = snap.idioma;
        const t = makeT(lang);
        this.time.addEvent({
          delay: 1400,
          callback: () => {
            gameBus.events.emit("message", {
              text: t("msg.collectionJoined", { name: variantName(lang, KOI_VARIANTS[event.variant]) }),
            });
            for (const offer of newlyReady) {
              this.time.addEvent({
                delay: 1100,
                callback: () => gameBus.events.emit("message", {
                  text: t("msg.collectorAchievement", { name: variantName(lang, KOI_VARIANTS[offer.variant]) }),
                }),
              });
            }
          },
        });
      }
    } else if (event.type === "pellets:finished") {
      for (const id of event.ids) {
        this.pelletViews.get(id)?.destroy();
        this.pelletViews.delete(id);
      }
    } else if (event.type === "fishes:changed") {
      gameState.requestSave();
      gameBus.events.emit("fishes:changed", { fishes: fishViewsOf(this.world) });
    } else if (event.type === "coin:drifted") {
      // dica só na primeira visita da sessão — depois a moeda se explica sozinha
      if (!this.coinHintShown) {
        this.coinHintShown = true;
        gameBus.events.emit("message", {
          text: makeT(gameState.getSnapshot().idioma)("msg.driftCoinHint"),
        });
      }
    }
  }

  private syncFishViews(): void {
    const aspects = (this.registry.get("atlasAspects") ?? {}) as Record<string, number>;
    const alive = new Set<number>();
    for (const fish of this.world.fishes) {
      alive.add(fish.fid);
      let view = this.fishViews.get(fish.fid);
      if (!view) {
        const variantKey = KOI_VARIANTS[fish.variant]?.key ?? KOI_VARIANTS[0].key;
        view = new KoiView(this, fish, aspects[variantKey] ?? 1);
        this.fishViews.set(fish.fid, view);
      }
      view.sync(fish);
    }
    for (const [fid, view] of this.fishViews) {
      if (!alive.has(fid)) {
        view.destroy();
        this.fishViews.delete(fid);
      }
    }
  }

  // símbolo "curado": pílula verde "✓ HEALED" que sobe do peixe e desaparece
  private showCuredFx(x: number, y: number, len: number): void {
    const label = this.add
      .text(0, 0, makeT(gameState.getSnapshot().idioma)("msg.curedBadge"), {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: `${Math.round(Math.max(12, len * 0.24))}px`,
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const w = label.width + 20;
    const h = label.height + 10;
    const bubble = this.add.graphics();
    bubble.fillStyle(0x5fae54, 0.95);
    bubble.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bubble.lineStyle(2, 0xffffff, 0.9);
    bubble.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, (h - 4) / 2);
    const box = this.add.container(x, y - len * 0.7, [bubble, label]).setDepth(33).setAlpha(0);
    this.tweens.add({
      targets: box,
      alpha: 1,
      y: box.y - 26,
      duration: 380,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: box,
          alpha: 0,
          y: box.y - 18,
          delay: 750,
          duration: 460,
          ease: "Sine.easeIn",
          onComplete: () => box.destroy(),
        });
      },
    });
  }

  private syncPelletViews(time: number): void {
    const alive = new Set<number>();
    for (const [id, pellet] of this.world.pellets) {
      alive.add(id);
      let view = this.pelletViews.get(id);
      if (!view) {
        view = new PelletView(this, pellet.feed);
        this.pelletViews.set(id, view);
      }
      view.sync(pellet, time);
    }
    for (const [id, view] of this.pelletViews) {
      if (!alive.has(id)) {
        view.destroy();
        this.pelletViews.delete(id);
      }
    }
  }

  // moeda da correnteza: a view espelha o estado do mundo; quando ele some,
  // a moeda afunda — a menos que tenha sido resgatada, quando estufa
  private syncDriftCoinView(time: number): void {
    const coin = this.world.driftCoin;
    if (!coin) {
      this.retireDriftCoinView("expire");
      return;
    }
    if (!this.driftCoinView) {
      this.driftCoinView = new DriftCoinView(this, coin, this.world.reduced);
    }
    this.driftCoinView.sync(coin, time);
  }

  private retireDriftCoinView(mode: "collect" | "expire"): void {
    if (!this.driftCoinView) return;
    const view = this.driftCoinView;
    this.driftCoinView = null;
    if (mode === "collect") view.pop();
    else view.sink();
  }

  private drawOverlay(): void {
    const w = this.world;
    const g = this.overlay;
    g.clear();
    this.labelBg.clear();
    this.label.setVisible(false);

    // mira: destaca o peixe que receberia a ração direcionada
    let aimFish: Fish | null = null;
    let aimBd = Math.min(w.w, w.h) * 0.08;
    if (w.aiming) {
      for (const f of w.fishes) {
        const d = Math.hypot(f.x - w.aim.x, f.y - w.aim.y);
        if (d < aimBd) { aimBd = d; aimFish = f; }
      }
    }

    const snap = gameState.getSnapshot();
    for (const f of w.fishes) {
      if (snap.selectedFid === f.fid) this.drawRing(f, 0xefb866, 0.95, [7, 5]);
    }
    if (!aimFish) return;

    this.drawRing(aimFish, 0xffffff, 0.9, [5, 4]);
    const stage = stageOf(aimFish.progress);
    // rótulo segue o idioma das configurações — lido a cada quadro de mira
    const t = makeT(snap.idioma);
    const name = variantName(snap.idioma, KOI_VARIANTS[aimFish.variant]).toUpperCase();
    const text =
      stage === 2
        ? t("aim.adultLabel", { name, stage: stageName(snap.idioma, 2), price: sellPriceFor(aimFish.variant) })
        : t("aim.growingLabel", {
            name, stage: stageName(snap.idioma, stage),
            progress: progText(aimFish.progress), goal: stage === 0 ? STAGE_MEDIO : STAGE_ADULTO,
          }) + (aimFish.sick ? t("aim.needsMedicine") : "");
    this.drawLabel(text, aimFish.x, aimFish.y - aimFish.len * 0.6);
  }

  private drawRing(f: Fish, color: number, alpha: number, dash: [number, number]): void {
    const g = this.overlay;
    const radius = f.len * 0.72;
    const cy = f.y - f.len * 0.05;
    g.lineStyle(2.5, color, alpha);
    // padrão tracejado: alterna arcos sólidos e vazios ao redor do círculo
    const segmentCount = 24;
    const solidRatio = dash[0] / (dash[0] + dash[1]);
    const arc = TAU / segmentCount;
    const drawn = arc * solidRatio;
    for (let i = 0; i < segmentCount; i += 2) {
      const start = i * arc;
      g.beginPath();
      g.arc(f.x, cy, radius, start, start + drawn);
      g.strokePath();
    }
  }

  private drawLabel(text: string, x: number, y: number): void {
    this.label.setText(text).setVisible(true).setDepth(31);
    const tw = this.label.width;
    const bx = Math.max(6, Math.min(this.world.w - tw - 22, x - tw / 2 - 8));
    const by = Math.max(8, y - 34);
    this.label.setPosition(bx + 8, by + 4);
    this.labelBg.fillStyle(0x092634, 0.88);
    this.labelBg.fillRoundedRect(bx, by, tw + 16, 20, 9);
  }

  private teardown(): void {
    this.disposers.forEach((off) => off());
    this.disposers = [];
    this.fishViews.clear();
    this.pelletViews.clear();
    this.driftCoinView?.destroy();
    this.driftCoinView = null;
    delete (window as unknown as { __koiFish?: unknown }).__koiFish;
    delete (window as unknown as { __koiStep?: unknown }).__koiStep;
    delete (window as unknown as { __koiFrame?: unknown }).__koiFrame;
    delete (window as unknown as { __koiCoin?: unknown }).__koiCoin;
    gameState.saveNow();
  }
}

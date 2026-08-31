import Phaser from "phaser";
import { BoyView } from "../entities/BoyView";
import { KoiView } from "../entities/KoiView";
import { PelletView } from "../entities/PelletView";
import { SceneryPiece } from "../entities/SceneryPiece";
import { WaterLayer } from "../entities/WaterLayer";
import { spawnSplash } from "../entities/effects";
import { SELL_PRICE, STAGE_ADULTO, STAGE_MEDIO, STAGE_NAMES } from "../data/economy";
import { SCENERY } from "../data/scenery";
import { KOI_VARIANTS, VARIANT_NAMES } from "../data/variants";
import { gameBus } from "../events";
import { gameState } from "../state/GameState";
import { registerActions } from "../systems/actions";
import { fishName, progText, stageOf } from "../systems/economy";
import { createWorld, spawnSchool, stepFishSim } from "../systems/fishSim";
import type { Fish, FishView, SimEvent, SimWorld } from "../types";
import { TAU } from "../types";

const fishViewsOf = (world: SimWorld): FishView[] =>
  world.fishes.map((f) => ({ fid: f.fid, variant: f.variant, progress: f.progress, sick: f.sick }));

export class PondScene extends Phaser.Scene {
  private world!: SimWorld;
  private water!: WaterLayer;
  private boy!: BoyView;
  private fishViews = new Map<number, KoiView>();
  private pelletViews = new Map<number, PelletView>();
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
    this.scale.on("resize", this.handleResize, this);

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

    this.rebuildScenery(gameState.getSnapshot().bought);

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
      gameBus.events.on("feed:thrown", ({ xPct, yPct }) => {
        spawnSplash(this, (xPct / 100) * this.world.w, (yPct / 100) * this.world.h, false);
        this.boy.startThrow();
      }),
    );
    this.disposers.push(
      gameBus.events.on("scenery:changed", ({ bought }) => this.rebuildScenery(bought)),
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

    gameBus.events.emit("fishes:changed", { fishes: fishViewsOf(this.world) });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    if (dt > 0) stepFishSim(this.world, dt, time);
    this.drainSimEvents();
    this.syncFishViews();
    this.syncPelletViews(time);
    if (!this.world.reduced) this.water.update(time, this.world.w, this.world.h);
    this.drawOverlay(time);
  }

  private handleResize(): void {
    this.applyLayout();
    this.rebuildScenery(gameState.getSnapshot().bought);
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
    this.world.aim = { x: (this.world.aim.x / (this.world.w || 1)) * W, y: (this.world.aim.y / (this.world.h || 1)) * H };
  }

  private rebuildScenery(bought: string[]): void {
    for (const piece of this.sceneryPieces.values()) piece.destroy();
    this.sceneryPieces.clear();
    for (const item of SCENERY) {
      if (!bought.includes(item.bundle ?? item.id)) continue;
      this.sceneryPieces.set(item.id, new SceneryPiece(this, item, this.world.w, this.world.h, this.world.reduced));
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
      gameBus.events.emit("message", {
        text:
          event.stage === 2
            ? `${fishName(event.variant, event.fid)} virou ADULTO — vale ◎${SELL_PRICE} na venda!`
            : `${fishName(event.variant, event.fid)} cresceu: ${STAGE_NAMES[event.stage]}!`,
      });
    } else if (event.type === "collection:unlocked") {
      const snap = gameState.getSnapshot();
      if (!snap.collection.includes(event.variant)) {
        gameState.patch({ collection: [...snap.collection, event.variant] });
        this.time.addEvent({
          delay: 1400,
          callback: () =>
            gameBus.events.emit("message", {
              text: `★ ${VARIANT_NAMES[event.variant]} entrou na sua coleção! Novas peças na Loja do Lago`,
            }),
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

  private drawOverlay(time: number): void {
    const w = this.world;
    const g = this.overlay;
    g.clear();
    this.labelBg.clear();
    this.label.setVisible(false);

    // peixe doente: cruz verde pulsando acima da cabeça
    for (const f of w.fishes) {
      if (!f.sick) continue;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.006 + f.seed);
      const r = Math.max(7, f.len * 0.14);
      const bx = f.x + Math.cos(f.heading) * f.len * 0.3;
      const by = f.y + Math.sin(f.heading) * f.len * 0.3 - f.len * 0.55 - r;
      g.fillStyle(0x5fae54, pulse);
      g.fillCircle(bx, by, r);
      g.lineStyle(Math.max(1.6, r * 0.26), 0xffffff, 1);
      g.beginPath();
      g.moveTo(bx - r * 0.42, by);
      g.lineTo(bx + r * 0.42, by);
      g.moveTo(bx, by - r * 0.42);
      g.lineTo(bx, by + r * 0.42);
      g.strokePath();
    }

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
    const text =
      stage === 2
        ? `${VARIANT_NAMES[aimFish.variant].toUpperCase()} • ADULTO • venda ◎${SELL_PRICE}`
        : `${VARIANT_NAMES[aimFish.variant].toUpperCase()} • ${STAGE_NAMES[stage]} ${progText(aimFish.progress)}/${stage === 0 ? STAGE_MEDIO : STAGE_ADULTO}${aimFish.sick ? " • DOENTE" : ""}`;
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
    this.scale.off("resize", this.handleResize, this);
    delete (window as unknown as { __koiFish?: unknown }).__koiFish;
    delete (window as unknown as { __koiStep?: unknown }).__koiStep;
    gameState.saveNow();
  }
}

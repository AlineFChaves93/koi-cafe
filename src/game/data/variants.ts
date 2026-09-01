// Koi species catalog. Each variant ships as a single 12×6 atlas under
// public/assets/koi/ (see data/animations.ts for the grid layout).
export type KoiVariant = { key: string; name: string; file: string; preview: string; color: string };

export const KOI_VARIANTS: readonly KoiVariant[] = [
  { key: "platinum-ogon", name: "Platina", file: "/assets/koi/platinum-ogon.webp", preview: "/assets/koi/previews/platinum-ogon.webp", color: "#f2f4f8" },
  { key: "hi-utsuri", name: "Hi Utsuri", file: "/assets/koi/hi-utsuri-v2.webp", preview: "/assets/koi/previews/hi-utsuri-v2.webp", color: "#e95b27" },
  { key: "yamabuki-ogon", name: "Yamabuki Ogon", file: "/assets/koi/yamabuki-ogon.webp", preview: "/assets/koi/previews/yamabuki-ogon.webp", color: "#dcbf3c" },
  { key: "sanke", name: "Sanke", file: "/assets/koi/sanke-v2.webp", preview: "/assets/koi/previews/sanke-v2.webp", color: "#e94b2b" },
  { key: "kohaku", name: "Kohaku", file: "/assets/koi/kohaku.webp", preview: "/assets/koi/previews/kohaku.webp", color: "#ef765e" },
  { key: "tancho", name: "Tancho", file: "/assets/koi/tancho.webp", preview: "/assets/koi/previews/tancho.webp", color: "#d94949" },
] as const;

export const VARIANT_NAMES = KOI_VARIANTS.map(({ name }) => name);

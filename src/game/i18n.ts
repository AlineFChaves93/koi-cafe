// Interface strings for both languages of the settings dialog. The dialog
// flips PlayerSnapshot.idioma; every HUD string renders through here (and the
// in-world aim label too), so the choice is visible game-wide and persists.

export type Lang = "pt" | "en";

const pt = {
  // top bar + settings
  "brand.tag": "CARP CAFÉ • TANQUE 07",
  "wallet.coins": "MOEDAS KOI",
  "settings.aria": "Configurações",
  "settings.title": "CONFIGURAÇÕES",
  "settings.sound": "SOM",
  "settings.soundOn": "LIGADO",
  "settings.soundOff": "MUDO",
  "settings.language": "IDIOMA",
  "settings.shakeFish": "TREMER PEIXES",
  "settings.shakeFishMsg": "Os peixes continuam nadando livremente!",

  // aim + world
  "world.aria": "Tanque de carpas visto de cima",
  "aim.release": "SOLTE AQUI",
  "aim.onSickFish": "NO PEIXE DOENTE",
  "aim.adultLabel": "{name} • {stage} • venda ◎{price}",
  "aim.growingLabel": "{name} • {stage} {progress}/{goal}",
  "aim.needsMedicine": " • PRECISA DE MAMADEIRA",

  // bottom console
  "feed.common": "Ração comum",
  "feed.commonHint": "toque para escolher • 3 porções viram médio",
  "feed.premium": "Ração especial",
  "feed.premiumHint": "toque para escolher • 1 porção vira o peixe médio • não adoece",
  "feed.medicine": "Mamadeira",
  "feed.medicineHint": "toque para escolher • cure o peixe doente • ◎{price}",
  "aim.drag": "ARRASTE A MIRA…",
  "aim.holdToMedicate": "SEGURE PARA MEDICAR",
  "aim.holdToFeed": "SEGURE PARA ALIMENTAR",
  "store.koiStore": "LOJA KOI",
  "store.lake": "LAGO",
  "store.lakeAria": "Loja do lago — nível {level}",

  // fish card
  "stage.baby": "BABY FISH",
  "stage.medium": "MÉDIO",
  "stage.adult": "GRANDE",
  "fish.needsMedicine": "Precisa de mamadeira",
  "fish.closeAria": "Fechar cartão do peixe",
  "fish.readyToSell": "Pronto para vender: ◎{price}",
  "fish.sell": "VENDER ◎{price}",
  "fish.use": "USAR",
  "fish.useWithPrice": "USAR ◎{price}",
  "fish.giveMedicineAria": "Dar mamadeira",

  // intro
  "intro.text": "Alimente o cardume, acompanhe cada koi crescer e transforme o lago no seu refúgio particular.",
  "intro.cta": "TOCAR PARA COMEÇAR",

  // lake shop (scenery + fish)
  "shop.aria": "Loja do lago",
  "shop.header": "LOJA DO LAGO • NÍVEL {level}/{max} • SALDO",
  "shop.close": "FECHAR",
  "shop.tabFish": "PEIXES",
  "shop.tabScenery": "PEÇAS DO CENÁRIO",
  "shop.surprise": "ESPÉCIE SURPRESA",
  "shop.buy": "COMPRAR ◎{price}",
  "shop.levelPieces": "NÍVEL {level} • {current}/{target} PEÇAS",
  "shop.achievementProgress": "CONQUISTA {current}/{target}",
  "shop.blockedLevel": "complete o nível {level}: {current} de {target} peças no lago",
  "shop.blockedCollection": "crie {target} espécies adultas: {current} de {target} na coleção",
  "shop.buyMysteryAria": "Comprar espécie surpresa por {price} moedas",
  "shop.buyFishAria": "Comprar {name} por {price} moedas",
  "shop.lockedFishAria": "Peixe misterioso bloqueado, {hint}",
  "shop.levelTag": "Nível {level}",
  "shop.inPondAria": "Nível {level} — no lago",
  "shop.lockedPieceAria": "Peça surpresa, nível {level} — posicione a peça anterior",
  "shop.buyPieceAria": "Peça surpresa, nível {level} — comprar por {price} moedas",

  // koi store (supplies + packages)
  "store.aria": "Loja Koi",
  "store.heading": "Mais momentos no lago",
  "store.sub": "Compre suprimentos com moedas ou escolha um pacote.",
  "store.balanceAria": "{coins} moedas disponíveis",
  "store.closeAria": "Fechar loja",
  "store.tabsAria": "Categorias da Loja Koi",
  "store.tabSupplies": "SUPRIMENTOS",
  "store.tabPackages": "PACOTES",
  "store.coins": "MOEDAS",
  "store.inStock": "NO ESTOQUE ×{count}",
  "store.buyButton": "COMPRAR",
  "store.noCoins": "SEM MOEDAS",
  "store.select": "SELECIONAR",
  "store.buyAria": "Comprar {name} por {price} moedas",
  "store.checkoutMsg": "{name}: checkout de exemplo — nesta amostra as moedas vêm da venda de peixes",

  "supply.remedy.name": "Mamadeira",
  "supply.remedy.detail": "Cura 1 peixe doente",
  "supply.common.name": "Punhado de ração",
  "supply.common.detail": "Adiciona 1 porção comum",
  "supply.bucket.name": "Balde de ração",
  "supply.bucket.detail": "Adiciona {count} porções comuns",
  "supply.premium.name": "Ração especial",
  "supply.premium.detail": "Adiciona 1 porção premium",

  "plan.handful.name": "Punhado",
  "plan.handful.detail": "+40 porções de ração",
  "plan.bucket.name": "Balde Koi",
  "plan.bucket.detail": "+100 porções + 80 moedas",
  "plan.bucket.tag": "MAIS POPULAR",
  "plan.club.name": "Clube Koi",
  "plan.club.detail": "100 porções/dia + 2× moedas",
  "plan.club.tag": "MELHOR VALOR",
} as const;

export type StringKey = keyof typeof pt;

// Same keys as pt — Record<StringKey, string> makes a missing EN entry a
// compile error instead of a blank label at runtime.
const en: Record<StringKey, string> = {
  // top bar + settings
  "brand.tag": "CARP CAFÉ • TANK 07",
  "wallet.coins": "KOI COINS",
  "settings.aria": "Settings",
  "settings.title": "SETTINGS",
  "settings.sound": "SOUND",
  "settings.soundOn": "ON",
  "settings.soundOff": "MUTED",
  "settings.language": "LANGUAGE",
  "settings.shakeFish": "SHAKE FISH",
  "settings.shakeFishMsg": "The fish keep swimming freely!",

  // aim + world
  "world.aria": "Koi tank seen from above",
  "aim.release": "RELEASE HERE",
  "aim.onSickFish": "ON THE SICK FISH",
  "aim.adultLabel": "{name} • {stage} • sell ◎{price}",
  "aim.growingLabel": "{name} • {stage} {progress}/{goal}",
  "aim.needsMedicine": " • NEEDS MEDICINE",

  // bottom console
  "feed.common": "Common feed",
  "feed.commonHint": "tap to pick • 3 portions grow it to medium",
  "feed.premium": "Premium feed",
  "feed.premiumHint": "tap to pick • 1 portion grows it to medium • never gets sick",
  "feed.medicine": "Medicine",
  "feed.medicineHint": "tap to pick • heal the sick fish • ◎{price}",
  "aim.drag": "DRAG THE AIM…",
  "aim.holdToMedicate": "HOLD TO MEDICATE",
  "aim.holdToFeed": "HOLD TO FEED",
  "store.koiStore": "KOI STORE",
  "store.lake": "LAKE",
  "store.lakeAria": "Lake shop — level {level}",

  // fish card
  "stage.baby": "BABY FISH",
  "stage.medium": "MEDIUM",
  "stage.adult": "ADULT",
  "fish.needsMedicine": "Needs medicine",
  "fish.closeAria": "Close fish card",
  "fish.readyToSell": "Ready to sell: ◎{price}",
  "fish.sell": "SELL ◎{price}",
  "fish.use": "USE",
  "fish.useWithPrice": "USE ◎{price}",
  "fish.giveMedicineAria": "Give medicine",

  // intro
  "intro.text": "Feed the shoal, watch every koi grow and turn the pond into your own private retreat.",
  "intro.cta": "TAP TO START",

  // lake shop (scenery + fish)
  "shop.aria": "Lake shop",
  "shop.header": "LAKE SHOP • LEVEL {level}/{max} • BALANCE",
  "shop.close": "CLOSE",
  "shop.tabFish": "FISH",
  "shop.tabScenery": "SCENERY",
  "shop.surprise": "SURPRISE SPECIES",
  "shop.buy": "BUY ◎{price}",
  "shop.levelPieces": "LEVEL {level} • {current}/{target} PIECES",
  "shop.achievementProgress": "ACHIEVEMENT {current}/{target}",
  "shop.blockedLevel": "complete level {level}: {current} of {target} pieces in the pond",
  "shop.blockedCollection": "raise {target} adult species: {current} of {target} in your collection",
  "shop.buyMysteryAria": "Buy surprise species for {price} coins",
  "shop.buyFishAria": "Buy {name} for {price} coins",
  "shop.lockedFishAria": "Mystery fish locked, {hint}",
  "shop.levelTag": "Level {level}",
  "shop.inPondAria": "Level {level} — in the pond",
  "shop.lockedPieceAria": "Surprise piece, level {level} — place the previous piece first",
  "shop.buyPieceAria": "Surprise piece, level {level} — buy for {price} coins",

  // koi store (supplies + packages)
  "store.aria": "Koi Store",
  "store.heading": "More moments by the pond",
  "store.sub": "Buy supplies with coins or pick a package.",
  "store.balanceAria": "{coins} coins available",
  "store.closeAria": "Close store",
  "store.tabsAria": "Koi Store categories",
  "store.tabSupplies": "SUPPLIES",
  "store.tabPackages": "PACKAGES",
  "store.coins": "COINS",
  "store.inStock": "IN STOCK ×{count}",
  "store.buyButton": "BUY",
  "store.noCoins": "NOT ENOUGH COINS",
  "store.select": "SELECT",
  "store.buyAria": "Buy {name} for {price} coins",
  "store.checkoutMsg": "{name}: sample checkout — in this demo coins come from selling fish",

  "supply.remedy.name": "Medicine",
  "supply.remedy.detail": "Heals 1 sick fish",
  "supply.common.name": "Handful of feed",
  "supply.common.detail": "Adds 1 common portion",
  "supply.bucket.name": "Feed bucket",
  "supply.bucket.detail": "Adds {count} common portions",
  "supply.premium.name": "Premium feed",
  "supply.premium.detail": "Adds 1 premium portion",

  "plan.handful.name": "Handful",
  "plan.handful.detail": "+40 feed portions",
  "plan.bucket.name": "Koi Bucket",
  "plan.bucket.detail": "+100 portions + 80 coins",
  "plan.bucket.tag": "MOST POPULAR",
  "plan.club.name": "Koi Club",
  "plan.club.detail": "100 portions/day + 2× coins",
  "plan.club.tag": "BEST VALUE",
};

const DICT: Record<Lang, Record<StringKey, string>> = { pt, en };

export type T = (key: StringKey, params?: Record<string, string | number>) => string;

export function makeT(lang: Lang): T {
  return (key, params) => {
    // chave desconhecida vira a própria chave no erro (visível), nunca um buraco mudo
    let text = DICT[lang][key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

// estágio do peixe por índice (0 baby, 1 médio, 2 grande)
const STAGE_KEYS = ["stage.baby", "stage.medium", "stage.adult"] as const;
export function stageName(lang: Lang, stage: number): string {
  return DICT[lang][STAGE_KEYS[Math.max(0, Math.min(2, stage))]];
}

// nomes de espécie: nomes japoneses de variedade passam direto, os traduzidos
// (ex.: Platina) vêm daqui
const VARIANT_OVERRIDES: Partial<Record<Lang, Record<string, string>>> = {
  en: { "platinum-ogon": "Platinum" },
};

export function variantName(lang: Lang, variant: { key: string; name: string }): string {
  return VARIANT_OVERRIDES[lang]?.[variant.key] ?? variant.name;
}

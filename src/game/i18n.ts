// Interface strings + floating game messages for both languages of the
// settings dialog. The dialog flips PlayerSnapshot.idioma; every HUD string,
// in-world label and game message renders through here, so the choice is
// visible game-wide and persists.

export type Lang = "pt" | "en";

const pt = {
  // top bar + settings
  "brand.tag": "CARP CAFÉ • TANQUE 07",
  "wallet.coins": "MOEDAS CARP",
  "settings.aria": "Configurações",
  "settings.title": "CONFIGURAÇÕES",
  "settings.sound": "SOM",
  "settings.soundOn": "LIGADO",
  "settings.soundOff": "MUDO",
  "settings.language": "IDIOMA",
  "settings.shakeFish": "TREMER PEIXES",
  "settings.shakeFishMsg": "Os peixes continuam nadando livremente!",
  "settings.reset": "RECOMEÇAR",
  "settings.resetButton": "ZERAR",
  "settings.resetTitle": "Zerar tudo?",
  "settings.resetWarning": "Apaga o lago, progresso, nome e pontuação mundial. Não é possível desfazer.",
  "settings.resetConfirm": "SIM, ZERAR",
  "settings.resetCancel": "CANCELAR",
  "settings.resetWorking": "ZERANDO…",
  "settings.resetError": "Não foi possível apagar a pontuação. Tente novamente online.",

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
  "intro.cta": "TOCAR PARA COMEÇAR",
  "intro.nameLabel": "SEU NOME NO LAGO",
  "intro.namePlaceholder": "Digite seu nome",
  "intro.nameVulgar": "Esse nome não serve pro lago — escolha outro carinhoso",

  // leaderboard
  "leaderboard.title": "RANKING",
  "leaderboard.worldwide": "MUNDO TODO",
  "leaderboard.openAria": "Abrir ranking mundial",
  "leaderboard.loading": "Buscando os melhores…",
  "leaderboard.unavailable": "Ranking offline",
  "leaderboard.empty": "Seja o primeiro carp keeper",
  "leaderboard.topTwenty": "TOP 20 MUNDIAL",
  "leaderboard.closeAria": "Fechar ranking",
  "leaderboard.scoreNote": "Pontuação = total de moedas conquistadas, sem descontar compras.",

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

  // carp store (supplies + packages)
  "store.aria": "Loja Carp",
  "store.heading": "Mais momentos no lago",
  "store.sub": "Compre suprimentos com as moedas que você ganhou.",
  "store.balanceAria": "{coins} moedas disponíveis",
  "store.closeAria": "Fechar loja",
  "store.tabsAria": "Categorias da Loja Carp",
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
  "plan.bucket.name": "Balde Carp",
  "plan.bucket.detail": "+100 porções + 80 moedas",
  "plan.bucket.tag": "MAIS POPULAR",
  "plan.club.name": "Clube Carp",
  "plan.club.detail": "100 porções/dia + 2× moedas",
  "plan.club.tag": "MELHOR VALOR",

  // floating game messages (actions, scene events, level ups)
  "msg.holdToAimHint": "Segure para mirar • perto de um peixe = ração só dele",
  "msg.noCoinsHandful": "Moedas insuficientes — um punhado custa ◎{price}",
  "msg.boughtHandful": "Punhado de ração +1 (−◎{price})",
  "msg.noCoinsBucket": "Moedas insuficientes — um balde custa ◎{price}",
  "msg.boughtBucket": "Balde de ração +{count} porções (−◎{price})",
  "msg.noCoinsPremium": "Moedas insuficientes — ração especial custa ◎{price}",
  "msg.boughtPremium": "Ração especial +1 (−◎{price}) • baby fish vira médio em 1 porção • peixes não adoecem",
  "msg.bucketEmptyTomorrow": "O balde de ração acabou — você ganha um novo amanhã",
  "msg.bucketRenewed": "Balde do dia renovado: +{count} porções de ração",
  "msg.noPremiumBuy": "Sem ração especial — compre por ◎{price} na Loja Carp",
  "msg.premiumRanOutConsole": "Ração especial acabou — o console voltou para a comum",
  "msg.premiumRanOutCommon": "Ração especial acabou — usando a comum",
  "msg.feedAimedPremium": "Ração especial para {fish} ({prog}){sick}",
  "msg.feedAimedCommon": "Ração para {fish} ({prog}){sick}",
  "msg.feedSickSuffix": " • 🍼 DOENTE — dê a mamadeira para curar",
  "msg.feedSchool": "Ração ao cardume • crescimento mais lento (+3 jogadas)",
  "msg.sickHintStock": "Toque nele e dê a mamadeira do estoque (essa é grátis!)",
  "msg.sickHintBuy": "Toque nele e dê a mamadeira (◎{price})",
  "msg.fishGotSick": "{fish} ficou DOENTE! {hint}",
  "msg.missionReady": "Missão pronta! Resgate +{coins} moedas",
  "msg.medicinePrice": "Mamadeira custa ◎{price} — venda peixes grandes para juntar moedas",
  "msg.releaseOnSick": "Solte a mamadeira sobre um peixe doente",
  "msg.releaseRemedyAim": "Solte a mamadeira em cima do peixe doente",
  "msg.coinCollected": "Moeda pescada da correnteza! +◎{amount}",
  "msg.fishAdult": "{fish} está {stage} — pronto para vender por ◎{price}",
  "msg.fishSelected": "{fish}: {stage} • {progress}/{goal} porções{sick}",
  "msg.fishNeedsMedicineSuffix": " • 🍼 precisa de mamadeira",
  "msg.fishSold": "{fish} vendido por ◎{price}! Use as moedas para escolher seu próximo peixe",
  "msg.lockedLevel": "Nível incompleto",
  "msg.lockedCollection": "Conquista necessária",
  "msg.lockedBuy": "🔒 {reason}: {label}",
  "msg.coinsMissing": "◎{price} necessários — faltam ◎{missing}",
  "msg.mysteryRevealed": "✨ Mistério revelado: {name}! Um baby fish chegou ao lago",
  "msg.babyArrived": "{name} baby fish chegou ao lago (−◎{price})",
  "msg.curedStock": "{fish} curado com a mamadeira do estoque!",
  "msg.curedBought": "{fish} curado com a mamadeira! (−◎{price})",
  "msg.remedyStocked": "Mamadeira +1 no estoque (−◎{price}) — mire no peixe doente e solte para curar",
  "msg.pieceLocked": "🔒 Compre e posicione a peça anterior do lago para destravar esta",
  "msg.coinsMissingSell": "◎{price} necessários — venda peixes grandes para juntar moedas",
  "msg.newPiece": "✨ Novidade no lago: {name}! (−◎{price})",
  "msg.levelRewardFeed": "🎁 Nível {level} completo: +{common} rações comuns e +{premium} especiais",
  "msg.levelRewardFeedFish1": "🎁 Nível {level}: +{common} rações comuns, +{premium} especiais e {names} disponível na loja!",
  "msg.levelRewardFeedFishN": "🎁 Nível {level}: +{common} rações comuns, +{premium} especiais e {names} disponíveis na loja!",
  "msg.dailyReward": "Recompensa diária: +{coins} moedas",
  "msg.missionDone": "Missão cumprida: +{coins} moedas Carp",
  "msg.selectedPremium": "Ração especial selecionada — 1 porção vira o peixe médio • não adoece",
  "msg.selectedRemedy": "Mamadeira selecionada — segure, mire no peixe doente e solte",
  "msg.selectedCommon": "Ração comum: 3 porções viram médio • +5 viram grande",
  "msg.fishWatching": "Os peixes próximos já estão de olho…",
  "msg.levelUp": "Nível {level} alcançado! O cardume agradece",
  "msg.grewAdult": "{fish} virou {stage} — vale ◎{price} na venda!",
  "msg.grewStage": "{fish} cresceu: {stage}!",
  "msg.collectionJoined": "★ {name} entrou na sua coleção!",
  "msg.collectorAchievement": "🎁 Conquista de colecionador: {name} disponível na loja de peixes!",
  "msg.driftCoinHint": "Uma moeda atravessa o lago na correnteza — toque nela para pescar!",
  "msg.curedBadge": "✓ CURADO",
  "msg.and": " e ",

  // fish-shop requirement labels
  "req.pond": "peixes no lago",
  "req.level": "peças no nível {level}",
  "req.sold": "peixes vendidos",
  "req.fed": "arraçoadas",
  "req.collection": "espécies adultas",
  "req.available": "Disponível",

  // scenery piece names (purchase messages)
  "scenery.samambaia-a": "Samambaia alta",
  "scenery.pad-esq": "Nenúfar grande",
  "scenery.arvore": "Árvore de outono",
  "scenery.ponte": "Ponte vermelha",
  "scenery.cerca-esq": "Cerca do canto esquerdo",
  "scenery.pedras-canto": "Pedras do canto",
  "scenery.fonte-bambu": "Fonte de bambu",
  "scenery.cerca-dir": "Cerca do canto direito",
  "scenery.tablado": "Tablado de madeira",
  "scenery.bacia": "Bacia de pedra",
} as const;

export type StringKey = keyof typeof pt;

// Same keys as pt — Record<StringKey, string> makes a missing EN entry a
// compile error instead of a blank label at runtime.
const en: Record<StringKey, string> = {
  // top bar + settings
  "brand.tag": "CARP CAFÉ • TANK 07",
  "wallet.coins": "CARP COINS",
  "settings.aria": "Settings",
  "settings.title": "SETTINGS",
  "settings.sound": "SOUND",
  "settings.soundOn": "ON",
  "settings.soundOff": "MUTED",
  "settings.language": "LANGUAGE",
  "settings.shakeFish": "SHAKE FISH",
  "settings.shakeFishMsg": "The fish keep swimming freely!",
  "settings.reset": "START OVER",
  "settings.resetButton": "RESET",
  "settings.resetTitle": "Reset everything?",
  "settings.resetWarning": "This erases your pond, progress, name, and worldwide score. It cannot be undone.",
  "settings.resetConfirm": "YES, RESET",
  "settings.resetCancel": "CANCEL",
  "settings.resetWorking": "RESETTING…",
  "settings.resetError": "We couldn't remove your score. Try again while online.",

  // aim + world
  "world.aria": "Carp tank seen from above",
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
  "store.koiStore": "CARP STORE",
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
  "intro.cta": "TAP TO START",
  "intro.nameLabel": "YOUR POND NAME",
  "intro.namePlaceholder": "Enter your name",
  "intro.nameVulgar": "That name won't float in this pond — please pick another",

  // leaderboard
  "leaderboard.title": "LEADERBOARD",
  "leaderboard.worldwide": "WORLDWIDE",
  "leaderboard.openAria": "Open worldwide leaderboard",
  "leaderboard.loading": "Finding the best keepers…",
  "leaderboard.unavailable": "Leaderboard offline",
  "leaderboard.empty": "Be the first carp keeper",
  "leaderboard.topTwenty": "WORLD TOP 20",
  "leaderboard.closeAria": "Close leaderboard",
  "leaderboard.scoreNote": "Score = all coins earned, without subtracting purchases.",

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

  // carp store (supplies + packages)
  "store.aria": "Carp Store",
  "store.heading": "More moments by the pond",
  "store.sub": "Buy supplies with the coins you earned.",
  "store.balanceAria": "{coins} coins available",
  "store.closeAria": "Close store",
  "store.tabsAria": "Carp Store categories",
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
  "plan.bucket.name": "Carp Bucket",
  "plan.bucket.detail": "+100 portions + 80 coins",
  "plan.bucket.tag": "MOST POPULAR",
  "plan.club.name": "Carp Club",
  "plan.club.detail": "100 portions/day + 2× coins",
  "plan.club.tag": "BEST VALUE",

  // floating game messages (actions, scene events, level ups)
  "msg.holdToAimHint": "Hold to aim • near a fish = a snack just for them",
  "msg.noCoinsHandful": "Not enough coins — a handful costs ◎{price}",
  "msg.boughtHandful": "Handful of feed +1 (−◎{price})",
  "msg.noCoinsBucket": "Not enough coins — a bucket costs ◎{price}",
  "msg.boughtBucket": "Feed bucket +{count} portions (−◎{price})",
  "msg.noCoinsPremium": "Not enough coins — premium feed costs ◎{price}",
  "msg.boughtPremium": "Premium feed +1 (−◎{price}) • 1 portion grows a baby fish to medium • fish never get sick",
  "msg.bucketEmptyTomorrow": "The feed bucket ran out — a new one arrives tomorrow",
  "msg.bucketRenewed": "Daily bucket renewed: +{count} feed portions",
  "msg.noPremiumBuy": "Out of premium feed — buy some for ◎{price} at the Carp Store",
  "msg.premiumRanOutConsole": "Premium feed ran out — the console is back on common feed",
  "msg.premiumRanOutCommon": "Premium feed ran out — using the common one",
  "msg.feedAimedPremium": "Premium feed for {fish} ({prog}){sick}",
  "msg.feedAimedCommon": "Feed for {fish} ({prog}){sick}",
  "msg.feedSickSuffix": " • 🍼 SICK — give the medicine to heal",
  "msg.feedSchool": "Feed for the shoal • slower growth (+3 throws)",
  "msg.sickHintStock": "Tap it and give a medicine from stock (this one's free!)",
  "msg.sickHintBuy": "Tap it and give the medicine (◎{price})",
  "msg.fishGotSick": "{fish} got SICK! {hint}",
  "msg.missionReady": "Mission ready! Claim +{coins} coins",
  "msg.medicinePrice": "Medicine costs ◎{price} — sell adult fish to save up coins",
  "msg.releaseOnSick": "Release the medicine over a sick fish",
  "msg.releaseRemedyAim": "Release the medicine right on the sick fish",
  "msg.coinCollected": "Coin fished from the current! +◎{amount}",
  "msg.fishAdult": "{fish} is {stage} — ready to sell for ◎{price}",
  "msg.fishSelected": "{fish}: {stage} • {progress}/{goal} portions{sick}",
  "msg.fishNeedsMedicineSuffix": " • 🍼 needs medicine",
  "msg.fishSold": "{fish} sold for ◎{price}! Use the coins to pick your next fish",
  "msg.lockedLevel": "Level incomplete",
  "msg.lockedCollection": "Achievement required",
  "msg.lockedBuy": "🔒 {reason}: {label}",
  "msg.coinsMissing": "◎{price} needed — you're ◎{missing} short",
  "msg.mysteryRevealed": "✨ Mystery revealed: {name}! A baby fish arrived at the pond",
  "msg.babyArrived": "A {name} baby fish arrived at the pond (−◎{price})",
  "msg.curedStock": "{fish} healed with a medicine from stock!",
  "msg.curedBought": "{fish} healed with the medicine! (−◎{price})",
  "msg.remedyStocked": "Medicine +1 in stock (−◎{price}) — aim at the sick fish and release to heal",
  "msg.pieceLocked": "🔒 Buy and place the previous pond piece to unlock this one",
  "msg.coinsMissingSell": "◎{price} needed — sell adult fish to save up coins",
  "msg.newPiece": "✨ New arrival at the pond: {name}! (−◎{price})",
  "msg.levelRewardFeed": "🎁 Level {level} complete: +{common} common feed and +{premium} premium feed",
  "msg.levelRewardFeedFish1": "🎁 Level {level}: +{common} common feed, +{premium} premium feed, and {names} unlocked in the shop!",
  "msg.levelRewardFeedFishN": "🎁 Level {level}: +{common} common feed, +{premium} premium feed, and {names} unlocked in the shop!",
  "msg.dailyReward": "Daily reward: +{coins} coins",
  "msg.missionDone": "Mission complete: +{coins} Carp coins",
  "msg.selectedPremium": "Premium feed selected — 1 portion grows the fish to medium • never gets sick",
  "msg.selectedRemedy": "Medicine selected — hold, aim at the sick fish and release",
  "msg.selectedCommon": "Common feed: 3 portions grow it to medium • +5 more to adult",
  "msg.fishWatching": "The nearby fish are already watching…",
  "msg.levelUp": "Level {level} reached! The shoal thanks you",
  "msg.grewAdult": "{fish} grew into a {stage} — worth ◎{price} when sold!",
  "msg.grewStage": "{fish} grew: {stage}!",
  "msg.collectionJoined": "★ {name} joined your collection!",
  "msg.collectorAchievement": "🎁 Collector achievement: {name} available in the fish shop!",
  "msg.driftCoinHint": "A coin drifts across the pond — tap it to scoop it up!",
  "msg.curedBadge": "✓ HEALED",
  "msg.and": " and ",

  // fish-shop requirement labels
  "req.pond": "fish in the pond",
  "req.level": "pieces at level {level}",
  "req.sold": "fish sold",
  "req.fed": "feedings",
  "req.collection": "adult species",
  "req.available": "Available",

  // scenery piece names (purchase messages)
  "scenery.samambaia-a": "Tall fern",
  "scenery.pad-esq": "Large lily pad",
  "scenery.arvore": "Autumn maple",
  "scenery.ponte": "Red bridge",
  "scenery.cerca-esq": "Left corner fence",
  "scenery.pedras-canto": "Corner stones",
  "scenery.fonte-bambu": "Bamboo fountain",
  "scenery.cerca-dir": "Right corner fence",
  "scenery.tablado": "Wooden dock",
  "scenery.bacia": "Stone basin",
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

// peças do cenário: o nome exibido nas mensagens de compra vem do dicionário
export function sceneryName(lang: Lang, id: string): string {
  return DICT[lang][`scenery.${id}` as StringKey] ?? id;
}

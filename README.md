# Koi Café

Um jogo 2D de alimentar carpas visto de cima: mire perto de um peixe para
alimentar só ele, cresça o cardume, colecione espécies e monte o lago na Loja
do Lago.

**Arquitetura: jogo primeiro.** O mundo (peixes, ração, cenário, plataforma,
água) roda em [Phaser 3](https://phaser.io) dentro de `src/game/`; o React é
apenas uma casca fina de HUD/menus em `src/ui/`. A camada de simulação é
TypeScript puro, sem engine, e roda em testes unitários.

## Rodando

```bash
npm install
npm run dev        # vite dev server
npm test           # vitest (economia, save, simulação)
npm run lint
npm run build      # dist/ estático (deployável em qualquer host estático)
```

Flags de desenvolvimento: `?autostart` pula a intro, `?cenacompleta` monta o
lago com todas as peças em uma sessão de pré-visualização que nunca altera o
save. Hooks de debug no console: `__koiFish()` (estado do cardume),
`__koiStep(dt)` (avança a simulação manualmente) e `__koiFrame()` (roda um
quadro completo de update+render sem depender de rAF, para abas em segundo
plano).

O mundo do Phaser usa uma resolução lógica fixa de **1280×720 (16:9)**.
`Phaser.Scale.FIT` mantém esse mesmo mundo e a casca de HUD usa a mesma escala
uniforme para apresentar a superfície inteira; redimensionar a janela nunca
recalcula posições, tamanhos, colisões ou velocidades da simulação. Em
celulares, o jogo orienta o jogador a usar a tela na horizontal.

## Mapa do código

```
src/
├── game/
│   ├── data/         conteúdo como DADOS, não constantes enterradas no código
│   │   ├── variants.ts     espécies de koi (atlases em public/assets/koi/)
│   │   ├── animations.ts   grade 12×6 dos atlases + linhas/fps por animação
│   │   ├── scenery.ts      catálogo da Loja do Lago + leiaute percentual
│   │   └── economy.ts      preços, estágios, carteira, planos da loja
│   ├── systems/      PURE TS — proibido importar phaser (regra no ESLint)
│   │   ├── fishSim.ts      boids/steering, seek de ração, colisões (o tick)
│   │   ├── feeding.ts      geometria do arremesso, scatter, doença
│   │   ├── economy.ts      regras puras de progressão (testadas)
│   │   ├── save.ts         save v4 versionado + migração do v3
│   │   └── actions.ts      handlers dos comandos (tudo que o jogador faz)
│   ├── state/GameState.ts  dono único do estado do jogador + persistência
│   ├── events.ts           barramento tipado: comandos (UI→jogo), eventos (jogo→UI)
│   ├── scenes/             BootScene (manifesto/assets/anims) e PondScene (mundo)
│   └── entities/           views: KoiView, PelletView, SceneryPiece, BoyView, WaterLayer
└── ui/               overlay React: GameShell, TopBar, BottomConsole, FishCard,
                      ShopTray, StoreModal, Intro + ui.css
```

Fluxo de dados em uma direção: a UI emite **comandos** (`gameBus.commands`),
os handlers em `systems/actions.ts` mutam o mundo puro + o `GameState`, e o
jogo emite **eventos** (`gameBus.events`) de volta para a UI. A simulação
nunca toca React/DOM; a cena drena a fila `world.events` após cada tick.

## Como fazer coisas

**Adicionar uma espécie de koi:** soloque o atlas normalizado (12 colunas ×
6 linhas; linhas = swim/fast/idle/turn/bob/eat) em `public/assets/koi/`,
adicione uma entrada em `data/variants.ts` e — se a folha fonte tiver menos
quadros por linha — ajuste `SHORT_ROWS` em `data/animations.ts`. Se a arte
bruta ainda não estiver normalizada, rode `npm run sprites:normalize`
(fontes em `../art-src/packs/koi-raw/variants`).

**Adicionar uma peça de cenário:** soloque a arte em
`public/assets/scenery/` (+ miniatura em `thumbs/`) e adicione uma entrada em
`data/scenery.ts` com posição percentual (`x`, `y`, `w`), preço (`price`) e
requisito de coleção (`req`). Efeitos: `fx: "stream"` (fonte) ou `"pipe"`
(bacia com ciclo de quadros), `floaty`/`sway`/`wind` para movimento.

**Ajustar a economia:** tudo em `data/economy.ts` (preços, estágios, valores
de crescimento, recompensas diárias, planos da loja). As regras puras em
`systems/economy.ts` têm testes — mudou o valor, atualize o teste.

**Save:** `koi-cafe-player-v4` no localStorage (peixes nomeados
`{variant, progress, sick}`, cenário comprado, carteira). O v3 legado
(arranjos posicionais) é migrado automaticamente no primeiro carregamento.
Cada navegador e origem (`localhost`, `127.0.0.1`, produção) mantém um save
separado; use `?cenacompleta` quando precisar comparar todos os assets sem
alterar nenhum deles.

## Assets e arte-fonte

`public/assets/` contém só o que o jogo serve (~17 MB). Matéria-prima e
pacotes não usados ficam fora do app, no workspace do projeto:

```
../art-src/    illustrator/ (.ai) · separated/ (peças cortadas) · packs/ (pond,
               pond3d, characters, koi-raw) · mockups/
../tools/      pipelines python (extract/match/process-scenery)
../archive/    exports antigos, screenshots de referência visual
```

Convenção de nomes: kebab-case em inglês, sem espaços/acentos; quadros de
animação como `frame-01.png…`.

## Notas de fidelidade da migração (canvas → Phaser)

- Animações dos koi usam `yoyo` para replicar o pingue-pongue antigo; o
  cross-fade entre quadros adjacentes do canvas original foi abandonado.
- O jato da fonte de bambu é uma textura procedural com pulso de alfa (o CSS
  animava background-position) — polir contra os screenshots em
  `../archive/app-outputs/` se necessário.
- Atlases com linhas curtas (kohaku/sanke) agora tocam só os quadros com
  sprite — antes piscava uma célula vazia no fim da linha.

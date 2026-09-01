import { Analytics } from "@vercel/analytics/react";
import { createRoot } from "react-dom/client";
import { GameShell } from "./ui/GameShell";
import "./ui/ui.css";

// No StrictMode: o canvas do Phaser não tolera o double-mount do dev mode.
createRoot(document.getElementById("root")!).render(
  <>
    <GameShell />
    <Analytics />
  </>,
);

"use client"
import type React from "react";
import { useRef, useEffect } from "react";

// ─── Layout (tout en vh/vw — pas de px — pour que WEBCAM_STYLE soit exact) ───
//
// Fenêtre : left 11vw, top 6vh, width 78vw, height 88vh
// Barre de titre  : 5vh
// Toolbar         : 3vh
// Barre de statut : 2vh
// Main content    : 88 - 5 - 3 - 2 = 78vh
//
// Right panel : padding "1vh 1vw", gap 0.5vh, contrôles 1.6vh, videos flex:1
//   Hauteur dispo pour les 2 vidéos :
//     78vh - 2×1vh(padding) - 2×1.6vh(ctrl) - 3×0.5vh(gaps) = 71.3vh
//     Chaque vidéo = 35.65vh
//
// Bottom video top  = 6 + 5 + 3 + 1 + 35.65 + 0.5 + 1.6 + 0.5 = 53.25vh
// Bottom video bot  = 53.25 + 35.65 = 88.9vh → from viewport bottom : 11.1vh
// Right panel left  = 11vw + 78vw×0.57 = 55.46vw → inner = 55.46vw + 1vw ≈ 56.5vw
// Right panel right = 89vw - 1vw = 88vw → CSS right = 12vw

export const WEBCAM_STYLE: React.CSSProperties = {
  position: "absolute",
  left:   "var(--msn-slot-left, 56.5vw)",
  top:    "var(--msn-slot-top, 53.25vh)",
  width:  "var(--msn-slot-width, 31.5vw)",
  height: "var(--msn-slot-height, 35.65vh)",
  objectFit: "cover",
  borderRadius: 3,
  zIndex: 5,
};

// Reads the live-measured slot position at capture time
export function getWebcamCaptureRect() {
  const stageEl = document.querySelector("[data-stage]");
  const stageRect = stageEl?.getBoundingClientRect() ?? { width: window.innerWidth, height: window.innerHeight };
  const style = document.documentElement.style;
  const left   = parseFloat(style.getPropertyValue("--msn-slot-left")  || "0");
  const top    = parseFloat(style.getPropertyValue("--msn-slot-top")   || "0");
  const width  = parseFloat(style.getPropertyValue("--msn-slot-width") || "0");
  const height = parseFloat(style.getPropertyValue("--msn-slot-height")|| "0");
  return { x: left / stageRect.width, y: top / stageRect.height, w: width / stageRect.width, h: height / stageRect.height };
}

export const WEBCAM_CAPTURE_RECT = { x: 0.565, y: 0.533, w: 0.315, h: 0.356 };

export const storyDecorator = "/bsn_scene.png";

// ─── Contenu ──────────────────────────────────────────────────────────────────
const MESSAGES = [
  { who: "Thomas", text: "Are we up for tonight guys?" },
  { who: "Karen",  text: "I'm down" },
  { who: "Thomas", text: "So I'll see you later then 🤔" },
];

// ─── Preload background image ─────────────────────────────────────────────────
let bgImgMSN: HTMLImageElement | null = null;
if (typeof window !== "undefined") {
  const img = document.createElement("img");
  img.src = "/fond_windows.jpg";
  bgImgMSN = img;
}

// ─── Slot position on canvas (reads live CSS vars set by useEffect) ───────────
function getSlotCanvas(w: number, h: number) {
  if (typeof document === "undefined") {
    return { sx: w * 0.565, sy: h * 0.533, sw: w * 0.315, sh: h * 0.356 };
  }
  const style = document.documentElement.style;
  const stageEl = document.querySelector("[data-stage]");
  const stageRect = stageEl?.getBoundingClientRect() ?? { width: window.innerWidth, height: window.innerHeight };
  const left   = parseFloat(style.getPropertyValue("--msn-slot-left")  || String(w * 0.565));
  const top    = parseFloat(style.getPropertyValue("--msn-slot-top")   || String(h * 0.533));
  const width  = parseFloat(style.getPropertyValue("--msn-slot-width") || String(w * 0.315));
  const height = parseFloat(style.getPropertyValue("--msn-slot-height")|| String(h * 0.356));
  return {
    sx: (left   / stageRect.width)  * w,
    sy: (top    / stageRect.height) * h,
    sw: (width  / stageRect.width)  * w,
    sh: (height / stageRect.height) * h,
  };
}

// ─── Canvas draw — background (drawn BEFORE webcam) ───────────────────────────
export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 1. Windows XP desktop wallpaper
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  if (bgImgMSN?.complete && bgImgMSN.naturalWidth > 0) {
    const scale = Math.min(w / bgImgMSN.naturalWidth, h / bgImgMSN.naturalHeight);
    const dw = bgImgMSN.naturalWidth * scale;
    const dh = bgImgMSN.naturalHeight * scale;
    ctx.drawImage(bgImgMSN, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  const wl = w * 0.19, wt = h * 0.15, ww = w * 0.62, wh = h * 0.70;
  const titleH = h * 0.055, toolbarH = h * 0.03, statusH = h * 0.02;
  const mainT = wt + titleH + toolbarH;
  const mainH = wh - titleH - toolbarH - statusH;
  const leftW = ww * 0.42;
  const rightX = wl + leftW;
  const rightW = ww - leftW;

  // 2. Window background
  ctx.fillStyle = "#ECE9D8";
  ctx.fillRect(wl, wt, ww, wh);

  // 2b. XP-style window border
  ctx.strokeStyle = "#0050C8";
  ctx.lineWidth = 6;
  ctx.strokeRect(wl, wt, ww, wh);
  ctx.strokeStyle = "#003090";
  ctx.lineWidth = 2;
  ctx.strokeRect(wl - 4, wt - 4, ww + 8, wh + 8);

  // 3. Title bar
  const grad = ctx.createLinearGradient(wl, wt, wl, wt + titleH);
  grad.addColorStop(0,   "#4C8EE0");
  grad.addColorStop(0.4, "#2468C8");
  grad.addColorStop(0.7, "#1A52AD");
  grad.addColorStop(1,   "#2068D0");
  ctx.fillStyle = grad;
  ctx.fillRect(wl, wt, ww, titleH);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(h * 0.018)}px Tahoma, sans-serif`;
  ctx.textBaseline = "top"; ctx.textAlign = "left";
  ctx.fillText("Karen", wl + 36, wt + 5);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `${Math.round(h * 0.012)}px Tahoma, sans-serif`;
  ctx.fillText("ready for the weekend <karentoh@hotmail.com>", wl + 36, wt + titleH * 0.56);

  // 4. Toolbar
  ctx.fillStyle = "#F0EDE4";
  ctx.fillRect(wl, wt + titleH, ww, toolbarH);

  // 5. Left chat panel
  ctx.fillStyle = "#fff";
  ctx.fillRect(wl, mainT, leftW, mainH);
  const fs = Math.round(h * 0.013);
  let my = mainT + 12;
  MESSAGES.forEach(({ who, text }) => {
    ctx.fillStyle = who === "Thomas" ? "#7A2B7A" : "#1E4A9A";
    ctx.font = `bold ${fs}px Tahoma`; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(`${who} says:`, wl + 12, my); my += fs + 2;
    ctx.fillStyle = "#333"; ctx.font = `${fs}px Tahoma`;
    ctx.fillText(`    ${text}`, wl + 12, my); my += fs + 10;
  });

  // 6. Right panel background
  ctx.fillStyle = "#DDD9CE";
  ctx.fillRect(rightX, mainT, rightW, mainH);

  // 7. Top video placeholder (Karen's cam)
  const pad = h * 0.01;
  const gap = h * 0.005;
  const ctrlH = h * 0.016;
  const videoH = (mainH - 2 * pad - 2 * ctrlH - 3 * gap) / 2;
  ctx.fillStyle = "#16182A";
  ctx.beginPath();
  ctx.roundRect(rightX + pad, mainT + pad, rightW - 2 * pad, videoH, 4);
  ctx.fill();
  ctx.fillStyle = "#444";
  ctx.font = `${Math.round(h * 0.012)}px Tahoma`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("Karen", rightX + rightW / 2, mainT + pad + videoH / 2);

  // 8. Clear the webcam slot — webcam will be drawn here by captureImage
  const { sx, sy, sw, sh } = getSlotCanvas(w, h);
  ctx.clearRect(sx, sy, sw, sh);

  // 9. Status bar
  ctx.fillStyle = "#E0DDD0";
  ctx.fillRect(wl, wt + wh - statusH, ww, statusH);
  ctx.fillStyle = "#555"; ctx.font = `${Math.round(h * 0.013)}px Tahoma`;
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText("Play the new Windows Live Messenger Games", wl + 8, wt + wh - statusH / 2);
}

// ─── Canvas draw — foreground (drawn AFTER webcam) ────────────────────────────
export function drawForCapture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Thin border around the webcam slot to frame it like the MSN UI
  const { sx, sy, sw, sh } = getSlotCanvas(w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, 4);
  ctx.stroke();
}

// ─── React component ──────────────────────────────────────────────────────────
const TOOLBAR_ICONS = ["👤", "📁", "🎬", "↩", "🎥", "⚙️", "🚫"];

export default function SceneMSN({ captureFlash }: { captureFlash?: boolean }) {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    const publish = () => {
      const stageEl = el.closest("[data-stage]");
      const stageRect = stageEl?.getBoundingClientRect() ?? { left: 0, top: 0 };
      const r = el.getBoundingClientRect();
      const root = document.documentElement;
      root.style.setProperty("--msn-slot-left",   `${r.left - stageRect.left}px`);
      root.style.setProperty("--msn-slot-top",    `${r.top  - stageRect.top}px`);
      root.style.setProperty("--msn-slot-width",  `${r.width}px`);
      root.style.setProperty("--msn-slot-height", `${r.height}px`);
    };

    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    window.addEventListener("resize", publish);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", publish);
    };
  }, []);

  return (
    <div style={{
      position: "absolute", inset: 0,
      height: "100vh",
      pointerEvents: "none",
      fontFamily: "Tahoma, 'Segoe UI', sans-serif",
      backgroundImage: "url(/fond_windows.jpg)",
      backgroundColor: "red",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
    }}>

      {/* ── MSN Window ── */}
      <div style={{
        position: "absolute",
        left: "19%", top: "15%",
        width: "62%", height: "70%",
        background: "#ECE9D8",
        border: "3px solid #0050C8",
        borderRadius: "8px 8px 0 0",
        boxShadow: "0 0 0 1px #003090, 5px 8px 24px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Title bar */}
        <div style={{
          height: "5.5vh", flexShrink: 0,
          background: "linear-gradient(to bottom, #4C8EE0 0%, #2468C8 40%, #1A52AD 70%, #2068D0 100%)",
          display: "flex", alignItems: "center",
          padding: "0 4px 0 8px", gap: "0.6vw",
          borderRadius: "5px 5px 0 0",
        }}>
          {/* App icon */}
          <div style={{ width: "2.2vh", height: "2.2vh", flexShrink: 0, borderRadius: "50%", background: "linear-gradient(135deg,#FF9800,#EF5722)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: "clamp(9px,1.3vh,14px)", fontWeight: "bold", lineHeight: 1.2, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>Karen</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "clamp(7px,1vh,11px)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ready for the weekend &lt;karentoh@hotmail.com&gt;
            </div>
          </div>
          {/* XP-style window buttons */}
          <div style={{ display: "flex", gap: "9px", alignSelf: "stretch", alignItems: "center", paddingTop: "1.3vh", paddingBottom: "1.3vh", paddingRight: "0.8vw" }}>
            {([
              { l: "−", close: false },
              { l: "□", close: false },
              { l: "✕", close: true  },
            ] as const).map(({ l, close }) => (
              <div key={l} style={{
                aspectRatio: "1",
                height: "100%",
                background: close
                  ? "linear-gradient(to bottom, #E06060 0%, #C02020 50%, #A01818 100%)"
                  : "linear-gradient(to bottom, #7EB4EA 0%, #4A84D8 50%, #3068C0 100%)",
                border: "1px solid rgba(0,0,0,0.5)",
                outline: "1px solid rgba(255,255,255,0.7)",
                outlineOffset: "1px",
                borderRadius: "2px",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff",
                fontSize: "1.6vh",
                fontWeight: "bold",
                lineHeight: 1,
                textShadow: "0 1px 1px rgba(0,0,0,0.6)",
                flexShrink: 0,
              }}>{l}</div>
            ))}
          </div>
        </div>

        {/* Toolbar — 3vh */}
        <div style={{
          height: "3vh", flexShrink: 0,
          background: "#F0EDE4", borderBottom: "1px solid #C8C0B0",
          display: "flex", alignItems: "center", padding: "0 0.5vw", gap: "0.1vw",
        }}>
          {TOOLBAR_ICONS.map((icon, i) => (
            <div key={i} style={{ width: "2.5vh", height: "2.5vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5vh" }}>
              {icon}
            </div>
          ))}
        </div>

        {/* Main content — 78vh (flex:1) */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

          {/* LEFT: Chat */}
          <div style={{ width: "42%", flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #B8B0A0" }}>

            {/* Messages */}
            <div style={{ flex: 1, background: "#fff", padding: "1vh 1.2vh", display: "flex", flexDirection: "column", gap: "0.8vh", overflow: "hidden" }}>
              {MESSAGES.map(({ who, text }, i) => (
                <div key={i}>
                  <div style={{ fontSize: "clamp(9px,1.2vh,13px)", fontWeight: "bold", color: who === "Thomas" ? "#7A2B7A" : "#1E4A9A" }}>
                    {who} says:
                  </div>
                  <div style={{ fontSize: "clamp(9px,1.2vh,13px)", color: "#333", paddingLeft: "1.5vh" }}>
                    {text}
                  </div>
                </div>
              ))}
            </div>

            {/* Resize handle */}
            <div style={{ height: "0.7vh", background: "#D8D4C8", borderTop: "1px solid #B8B0A0", borderBottom: "1px solid #B8B0A0" }} />

            {/* Input area — 12vh */}
            <div style={{ height: "12vh", display: "flex", flexDirection: "column" }}>
              <div style={{ height: "2.5vh", flexShrink: 0, background: "#F0EDE4", borderBottom: "1px solid #D0C8BC", display: "flex", alignItems: "center", padding: "0 0.8vh", gap: "0.5vh" }}>
                {["😊", "🤔", "((S))", "🔇", "A|B", "✏️", "🖼️", "🎁"].map((icon, i) => (
                  <div key={i} style={{ fontSize: "clamp(7px,1vh,10px)", color: "#666", whiteSpace: "nowrap" }}>{icon}</div>
                ))}
              </div>
              <div style={{ flex: 1, display: "flex", background: "#fff" }}>
                <div style={{ flex: 1, padding: "0.6vh 1vh", fontSize: "clamp(9px,1.2vh,13px)", color: "#333" }}>
                  Tonight? of course! 😊
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 0.8vh 0.8vh", gap: "0.4vh" }}>
                  {["Send", "Search"].map((label) => (
                    <div key={label} style={{ padding: "0.2vh 1vh", background: "#E8E2D8", border: "1px solid #A0907A", borderRadius: 2, fontSize: "clamp(8px,1vh,11px)", textAlign: "center", color: "#333" }}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Video panels — padding "1vh 1vw", gap "0.5vh" */}
          <div style={{
            flex: 1, background: "#DDD9CE",
            display: "flex", flexDirection: "column",
            padding: "1vh 1vw", gap: "0.5vh",
          }}>
            {/* Top video (remote) */}
            <div style={{ flex: 1, background: "#16182A", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#444", fontSize: "clamp(8px,1vh,12px)" }}>Karen</span>
            </div>

            {/* Controls top — 1.6vh */}
            <div style={{ height: "1.6vh", display: "flex", alignItems: "center", gap: "0.4vh", paddingLeft: "0.3vh" }}>
              <div style={{ width: "1.3vh", height: "1.3vh", borderRadius: "50%", background: "#888", border: "1px solid #666", flexShrink: 0 }} />
              <div style={{ flex: 1, height: "0.7vh", background: "#C8C4BC", borderRadius: 2 }} />
              <div style={{ fontSize: "0.9vh", color: "#888" }}>▾</div>
            </div>

            {/* Bottom video — webcam live (position tracked via getBoundingClientRect) */}
            <div ref={slotRef} style={{ flex: 1, background: "#16182A", borderRadius: 4 }} />

            {/* Controls bottom — 1.6vh */}
            <div style={{ height: "1.6vh", display: "flex", alignItems: "center", gap: "0.4vh", paddingLeft: "0.3vh" }}>
              <div style={{ width: "1.3vh", height: "1.3vh", borderRadius: "50%", background: "#888", border: "1px solid #666", flexShrink: 0 }} />
              <div style={{ flex: 1, height: "0.7vh", background: "#C8C4BC", borderRadius: 2 }} />
              <div style={{ fontSize: "0.9vh", color: "#888" }}>▾</div>
            </div>
          </div>
        </div>

        {/* Status bar — 2vh */}
        <div style={{
          height: "2vh", flexShrink: 0,
          background: "#E0DDD0", borderTop: "1px solid #B8B0A0",
          display: "flex", alignItems: "center", paddingLeft: "0.8vh",
          fontSize: "clamp(8px,1vh,12px)", color: "#555",
        }}>
          Play the new Windows Live Messenger Games
        </div>
      </div>

      {captureFlash && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)" }} />
      )}
    </div>
  );
}

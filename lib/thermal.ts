// 80 mm thermal paper — printable area ≈ 72 mm at 203 dpi → 576 px wide
const PRINT_W  = 576;
const FOOTER_H = 44;   // height of the event text strip at the bottom
const CONTRAST = 1.45; // > 1 boosts contrast; thermal paper needs stronger blacks

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}

async function buildThermalCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img   = await loadImg(dataUrl);
  const scale = PRINT_W / img.naturalWidth;
  const imgH  = Math.round(img.naturalHeight * scale);
  const total = imgH + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width  = PRINT_W;
  canvas.height = total;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // White base
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PRINT_W, total);

  // Scale image to print width
  ctx.drawImage(img, 0, 0, PRINT_W, imgH);

  // Convert to grayscale + contrast boost for thermal output.
  // Thermal paper tends to wash out mid-tones, so we push grays toward black.
  const id = ctx.getImageData(0, 0, PRINT_W, imgH);
  const d  = id.data;
  for (let i = 0; i < d.length; i += 4) {
    // Perceptual luminance (ITU-R BT.709)
    let g = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    g = Math.max(0, Math.min(255, (g - 128) * CONTRAST + 128));
    d[i] = d[i + 1] = d[i + 2] = g;
    d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);

  // Separator line
  ctx.fillStyle = "#000";
  ctx.fillRect(0, imgH, PRINT_W, 1);

  // Event name footer
  ctx.font         = `bold ${Math.round(FOOTER_H * 0.42)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BOURBIER PARTY", PRINT_W / 2, imgH + FOOTER_H / 2);

  return canvas;
}

export async function buildThermalDataUrl(dataUrl: string): Promise<string> {
  const canvas = await buildThermalCanvas(dataUrl);
  return canvas.toDataURL("image/png");
}

// Opens a new tab with the thermal-optimised image and a print button.
// window.open is called synchronously (inside the user-gesture stack)
// so popup blockers don't interfere; the image processing happens asynchronously after.
export function openThermalPreview(dataUrl: string): Promise<void> {
  const win = window.open("", "_blank");
  if (!win) return Promise.resolve();

  // Immediate loading screen — keeps the tab alive while we process
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>` +
    `body{background:#666;display:flex;align-items:center;justify-content:center;` +
    `min-height:100vh;margin:0;font-family:Arial,sans-serif;color:#fff;` +
    `font-size:15px;letter-spacing:.12em}</style></head>` +
    `<body>PRÉPARATION…</body></html>`
  );
  win.document.close();

  return buildThermalCanvas(dataUrl).then((canvas) => {
    if (win.closed) return;
    const printDataUrl = canvas.toDataURL("image/png");

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Impression — Bourbier Party</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{
      background:#666;
      display:flex;flex-direction:column;align-items:center;
      min-height:100vh;padding:32px 16px;gap:20px;
      font-family:Arial,sans-serif;
    }
    .label{
      color:#fff;font-size:11px;letter-spacing:.12em;
      text-transform:uppercase;opacity:.7;
    }
    .paper{
      background:#fff;padding:6px;
      box-shadow:0 8px 40px rgba(0,0,0,.55);
    }
    .paper img{display:block;width:302px} /* 80 mm at 96 dpi CSS */
    .actions{display:flex;gap:12px;margin-top:4px}
    button{
      padding:11px 28px;font-size:13px;font-weight:bold;
      letter-spacing:.08em;cursor:pointer;border:none;border-radius:4px;
    }
    .btn-print{background:#111;color:#fff}
    .btn-print:hover{background:#333}
    .btn-close{background:#fff;color:#111;border:1px solid #ccc}
    @media print{
      body{background:#fff;padding:0;gap:0;justify-content:flex-start}
      .label,.actions{display:none}
      .paper{box-shadow:none;padding:0}
      .paper img{width:72mm} /* printable area on 80 mm paper */
    }
  </style>
</head>
<body>
  <p class="label">Aperçu impression thermique &middot; 80 mm</p>
  <div class="paper">
    <img src="${printDataUrl}" alt="Impression thermique">
  </div>
  <div class="actions">
    <button class="btn-print" onclick="window.print()">Imprimer</button>
    <button class="btn-close" onclick="window.close()">Fermer</button>
  </div>
</body>
</html>`);
    win.document.close();
  });
}

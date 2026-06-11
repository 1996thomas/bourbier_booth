import QRCode from "qrcode";

// 80 mm thermal paper — printable area 72 mm at 203 dpi → 576 px wide
const PRINT_W  = 576;
const CONTRAST = 1.1;

const QR_SIZE    = 220;
const QR_PAD     = 28;
const QR_TEXT_H  = 28;
const QR_TOTAL_H = QR_PAD + QR_SIZE + 10 + QR_TEXT_H + QR_PAD;

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}

// Grayscale + contrast boost — thermal paper washes out mid-tones
function applyThermal(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const id = ctx.getImageData(0, 0, w, h);
  const d  = id.data;
  for (let i = 0; i < d.length; i += 4) {
    let g = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    g = Math.max(0, Math.min(255, (g - 128) * CONTRAST + 128));
    d[i] = d[i + 1] = d[i + 2] = g;
    d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
}

// Build the photo section: full width, aspect-ratio preserved, white background
async function buildPhotoCanvas(photoDataUrl: string, decoratorSrc?: string): Promise<HTMLCanvasElement> {
  const photoImg = await loadImg(photoDataUrl);

  const photoH = Math.round(photoImg.naturalHeight * PRINT_W / photoImg.naturalWidth);

  const canvas = document.createElement("canvas");
  canvas.width  = PRINT_W;
  canvas.height = photoH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PRINT_W, photoH);

  // Photo at full print width
  ctx.drawImage(photoImg, 0, 0, PRINT_W, photoH);

  // Decorator overlay at full size (transparent PNG on top)
  if (decoratorSrc) {
    const decorImg = await loadImg(decoratorSrc);
    ctx.drawImage(decorImg, 0, 0, PRINT_W, photoH);
  }

  applyThermal(ctx, PRINT_W, photoH);

  return canvas;
}

export async function buildLabelDataUrl(photoDataUrl: string, qrUrl: string, decoratorSrc?: string): Promise<string> {
  const [photoCanvas, qrCanvas] = await Promise.all([
    buildPhotoCanvas(photoDataUrl, decoratorSrc),
    (async () => {
      const c = document.createElement("canvas");
      await QRCode.toCanvas(c, qrUrl, { width: QR_SIZE, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
      return c;
    })(),
  ]);

  const label = document.createElement("canvas");
  label.width  = PRINT_W;
  label.height = photoCanvas.height + QR_TOTAL_H;

  const ctx = label.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PRINT_W, label.height);

  ctx.drawImage(photoCanvas, 0, 0);

  // Separator
  ctx.fillStyle = "#ccc";
  ctx.fillRect(0, photoCanvas.height, PRINT_W, 1);

  // QR centered
  const qrX = Math.round((PRINT_W - QR_SIZE) / 2);
  const qrY = photoCanvas.height + QR_PAD;
  ctx.drawImage(qrCanvas, qrX, qrY);

  // Caption
  ctx.fillStyle = "#000";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Scanne pour télécharger ta photo", PRINT_W / 2, qrY + QR_SIZE + 10 + QR_TEXT_H / 2);

  return label.toDataURL("image/png");
}

export async function buildThermalDataUrl(dataUrl: string): Promise<string> {
  const img   = await loadImg(dataUrl);
  const imgH  = Math.round(img.naturalHeight * PRINT_W / img.naturalWidth);

  const canvas = document.createElement("canvas");
  canvas.width  = PRINT_W;
  canvas.height = imgH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PRINT_W, imgH);
  ctx.drawImage(img, 0, 0, PRINT_W, imgH);
  applyThermal(ctx, PRINT_W, imgH);

  return canvas.toDataURL("image/png");
}

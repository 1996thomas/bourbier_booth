import html2canvas from "html2canvas";
import type { SceneDrawFn } from "../components/SceneOverlay";

export function captureImage(
  video: HTMLVideoElement,
  options: {
    drawBackground?: SceneDrawFn;
    drawForeground: SceneDrawFn;
    webcamRect?: { x: number; y: number; w: number; h: number };
    unmirror?: boolean;
  }
): string {
  const { drawBackground, drawForeground, webcamRect, unmirror = true } = options;
  const W = 2880, H = 2160;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  drawBackground?.(ctx, W, H);

  const vx = (webcamRect?.x ?? 0) * W;
  const vy = (webcamRect?.y ?? 0) * H;
  const vcW = (webcamRect?.w ?? 1) * W;
  const vcH = (webcamRect?.h ?? 1) * H;

  const videoW = video.videoWidth  || video.clientWidth;
  const videoH = video.videoHeight || video.clientHeight;
  const videoAspect = videoW / videoH;
  const rectAspect  = vcW  / vcH;

  let sx = 0, sy = 0, sw = videoW, sh = videoH;
  if (videoAspect > rectAspect) {
    sw = Math.floor(sh * rectAspect);
    sx = Math.floor((videoW - sw) / 2);
  } else {
    sh = Math.floor(sw / rectAspect);
    sy = Math.floor((videoH - sh) / 2);
  }

  if (unmirror) {
    ctx.save();
    ctx.translate(vx + vcW, vy);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, vcW, vcH);
    ctx.restore();
  } else {
    ctx.drawImage(video, sx, sy, sw, sh, vx, vy, vcW, vcH);
  }

  drawForeground(ctx, W, H);

  return canvas.toDataURL("image/jpeg", 0.93);
}

// Charge une image (data URL ou chemin) et résout quand elle est prête
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Capture the actual DOM render via html2canvas and composite the webcam into the slot
export async function captureFromDOM(
  stageEl: HTMLElement,
  video: HTMLVideoElement,
  options: {
    webcamRectFn?: () => { x: number; y: number; w: number; h: number };
    webcamRect?: { x: number; y: number; w: number; h: number };
    drawForeground?: SceneDrawFn;
    unmirror?: boolean;
  }
): Promise<string> {
  const { webcamRectFn, webcamRect, drawForeground, unmirror = true } = options;
  const W = 2880, H = 2160;

  const stageRect = stageEl.getBoundingClientRect();
  const scale = W / stageRect.width;

  const domCanvas = await html2canvas(stageEl, {
    scale,
    useCORS: true,
    allowTaint: true,
    ignoreElements: (el: Element) =>
      el.tagName === "VIDEO" || el.hasAttribute("data-nocapture"),
    backgroundColor: null,
    logging: false,
  });

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(domCanvas, 0, 0, W, H);

  const wr = webcamRectFn ? webcamRectFn() : webcamRect;

  const blitWebcam = (vx: number, vy: number, vw: number, vh: number) => {
    const videoW = video.videoWidth || video.clientWidth;
    const videoH = video.videoHeight || video.clientHeight;
    const slotAspect = vw / vh;
    const videoAspect = videoW / videoH;
    let sx = 0, sy = 0, sw = videoW, sh = videoH;
    if (videoAspect > slotAspect) {
      sw = Math.floor(sh * slotAspect);
      sx = Math.floor((videoW - sw) / 2);
    } else {
      sh = Math.floor(sw / slotAspect);
      sy = Math.floor((videoH - sh) / 2);
    }
    if (unmirror) {
      ctx.save();
      ctx.translate(vx + vw, vy);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, vw, vh);
      ctx.restore();
    } else {
      ctx.drawImage(video, sx, sy, sw, sh, vx, vy, vw, vh);
    }
  };

  if (wr) {
    const vx = wr.x * W, vy = wr.y * H, vw = wr.w * W, vh = wr.h * H;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(vx, vy, vw, vh);
    ctx.globalCompositeOperation = "destination-over";
    blitWebcam(vx, vy, vw, vh);
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.globalCompositeOperation = "destination-over";
    blitWebcam(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }

  if (drawForeground) drawForeground(ctx, W, H);

  return canvas.toDataURL("image/jpeg", 0.93);
}

// Compose la scène paysage dans un canvas 9:16 (1080×1920) avec décorateur
export async function composeForStory(
  sceneDataUrl: string,
  decoratorSrc: string
): Promise<string> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const [sceneImg, decorImg] = await Promise.all([
    loadImage(sceneDataUrl),
    loadImage(decoratorSrc),
  ]);

  // 1. Fond noir/gris
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);

  // 2. Scène paysage réduite de 20%, centrée horizontalement, montée de 10% du canvas
  const sw = Math.round(W * 0.85);
  const sh = Math.round(sw * (sceneImg.naturalHeight / sceneImg.naturalWidth * 0.95));
  const sx = Math.round((W - sw) / 2);
  const sy = Math.round((H - sh) / 2) - Math.round(H * 0.05);
  ctx.drawImage(sceneImg, sx, sy, sw, sh);

  // 3. Décorateur par-dessus (transparent aux bons endroits)
  ctx.drawImage(decorImg, 0, 0, W, H);

  return canvas.toDataURL("image/jpeg", 0.93);
}

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
  const W = 1920, H = 1080;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");

  // 1. Arrière-plan (image + overlay scène)
  drawBackground?.(ctx, W, H);

  // 2. Webcam dans son rect (ou plein écran si pas de rect)
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

  // 3. Premier plan (overlay, scanlines, bordures…)
  drawForeground(ctx, W, H);

  return canvas.toDataURL("image/png");
}

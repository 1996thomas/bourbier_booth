"use client";
import { useEffect, useRef } from "react";

export function useSegmentation(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let active      = true;
    let pendingSend = false;
    let lastSegAt   = 0;
    const SEG_INTERVAL = 1000 / 20; // cap at 20 fps

    // DPR capped at 1 — no Retina overhead on a dedicated screen
    const syncSize = () => {
      const w = Math.round(canvas.clientWidth);
      const h = Math.round(canvas.clientHeight);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width  = w;
        canvas.height = h;
      }
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);

    // Temp canvas for mask blur — reused across frames, recreated only on size change
    let tmpCanvas: OffscreenCanvas | null = null;
    let tmpCtx: OffscreenCanvasRenderingContext2D | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let seg: any = null;

    const init = async () => {
      const { SelfieSegmentation } = await import("@mediapipe/selfie_segmentation");

      seg = new SelfieSegmentation({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`,
      });

      seg.setOptions({ modelSelection: 1 });

      seg.onResults(({ segmentationMask, image }: {
        segmentationMask: CanvasImageSource;
        image: CanvasImageSource;
      }) => {
        if (!active) return;
        pendingSend = false;

        const cw = canvas.width;
        const ch = canvas.height;
        if (!cw || !ch) return;

        const video = videoRef.current;
        const srcW  = video?.videoWidth  || 640;
        const srcH  = video?.videoHeight || 480;

        // Cover-crop: same region for both image and mask → they stay aligned
        const slotAr = cw / ch;
        const srcAr  = srcW / srcH;
        let sx = 0, sy = 0, sw = srcW, sh = srcH;
        if (srcAr > slotAr) {
          sw = Math.floor(sh * slotAr);
          sx = Math.floor((srcW - sw) / 2);
        } else {
          sh = Math.floor(sw / slotAr);
          sy = Math.floor((srcH - sh) / 2);
        }

        // Draw video frame
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, cw, ch);
        const imgData = ctx.getImageData(0, 0, cw, ch);

        // Reuse temp canvas — only reallocate when the canvas size changes
        if (!tmpCanvas || tmpCanvas.width !== cw || tmpCanvas.height !== ch) {
          tmpCanvas = new OffscreenCanvas(cw, ch);
          tmpCtx    = tmpCanvas.getContext("2d")!;
        }
        tmpCtx!.clearRect(0, 0, cw, ch);
        tmpCtx!.filter = `blur(${Math.max(1, Math.round(cw * 0.003))}px)`;
        tmpCtx!.drawImage(segmentationMask, sx, sy, sw, sh, 0, 0, cw, ch);
        tmpCtx!.filter = "none";
        const maskData = tmpCtx!.getImageData(0, 0, cw, ch);

        for (let i = 0; i < imgData.data.length; i += 4) {
          const t      = maskData.data[i] / 255;
          const c      = Math.max(0, Math.min(1, (t - 0.5) * 1 + 0.5));
          const smooth = c * c * (3 - 2 * c);
          imgData.data[i + 3] = Math.round(smooth * 255);
        }
        ctx.putImageData(imgData, 0, 0);
      });

      const loop = () => {
        if (!active) return;
        const now = performance.now();
        if (!pendingSend && now - lastSegAt >= SEG_INTERVAL) {
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            lastSegAt   = now;
            pendingSend = true;
            seg.send({ image: video }).catch(() => { pendingSend = false; });
          }
        }
        animId = requestAnimationFrame(loop);
      };

      if (active) animId = requestAnimationFrame(loop);
    };

    init();

    return () => {
      active = false;
      cancelAnimationFrame(animId);
      ro.disconnect();
      try { seg?.close(); } catch {}
    };
  }, [enabled, videoRef]);

  return canvasRef;
}

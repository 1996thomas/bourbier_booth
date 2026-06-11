"use client";
import { useEffect, useRef } from "react";

// ─── Tuning constants ────────────────────────────────────────────────────────

// Temporal EMA: portion of the previous smoothed mask kept each frame.
const EMA_ALPHA = 0.6;

// Edge feathering: Gaussian blur applied to the alpha mask in output-canvas px.
const FEATHER_PX = 4;

// Soft lower threshold after EMA — collapses fringe noise to 0.
const ALPHA_THRESHOLD = 0.12;

// Resolution of the pre-crop canvas fed to the model.
// Must match the slot's AR; width is fixed, height is derived each frame.
const PROC_W = 256;

// ─── Asset paths (served from our own domain — no external CDN calls) ────────
const WASM_PATH  = "/mediapipe/";
const MODEL_PATH = "/models/selfie_multiclass_256x256.tflite";

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSegmentation(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let active = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let segmenter: any = null;

    // Pre-crop canvas: the video frame cover-cropped to the slot's AR
    // before being handed to the segmenter. Ensures the mask geometry
    // matches what is actually displayed.
    let procCanvas: HTMLCanvasElement | null = null;
    let procCtx: CanvasRenderingContext2D | null = null;

    // Mask-side buffers — allocated once, regrown only on dimension change
    let maskCanvas: OffscreenCanvas | null = null;
    let maskCtx: OffscreenCanvasRenderingContext2D | null = null;
    let smoothedMask: Float32Array | null = null;
    let rgbaBuffer: Uint8ClampedArray<ArrayBuffer> | null = null;
    let maskReady = false;
    let lastVideoTime = -1;

    const ctx = canvas.getContext("2d", { alpha: true })!;

    // Keep the output canvas bitmap size in sync with its CSS layout slot
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

    // Cover-crop: returns the source rect centred on the video that fills the
    // target slot without letterboxing. Used for both inference input and final
    // compositing so geometry stays identical between the two.
    function coverCrop(
      srcW: number, srcH: number, slotW: number, slotH: number
    ): { sx: number; sy: number; sw: number; sh: number } {
      const slotAr = slotW / slotH;
      const srcAr  = srcW  / srcH;
      let sx = 0, sy = 0, sw = srcW, sh = srcH;
      if (srcAr > slotAr) {
        sw = Math.floor(sh * slotAr);
        sx = Math.floor((srcW - sw) / 2);
      } else {
        sh = Math.floor(sw / slotAr);
        sy = Math.floor((srcH - sh) / 2);
      }
      return { sx, sy, sw, sh };
    }

    // ── Initialisation ───────────────────────────────────────────────────────
    const init = async () => {
      try {
        const { ImageSegmenter, FilesetResolver } =
          await import("@mediapipe/tasks-vision");

        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

        const baseOpts = (delegate: "GPU" | "CPU") => ({
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          runningMode: "VIDEO" as const,
          outputCategoryMask:    false,
          outputConfidenceMasks: true,
        });

        try {
          segmenter = await ImageSegmenter.createFromOptions(vision, baseOpts("GPU"));
          console.log("[Segmentation] MediaPipe ready — GPU delegate");
        } catch {
          segmenter = await ImageSegmenter.createFromOptions(vision, baseOpts("CPU"));
          console.log("[Segmentation] MediaPipe ready — CPU/WASM delegate");
        }

        if (!active) { segmenter.close(); return; }

        // ── Frame loop ───────────────────────────────────────────────────────
        const loop = () => {
          if (!active) return;

          const video = videoRef.current;
          if (!video || video.readyState < 2) {
            animId = requestAnimationFrame(loop);
            return;
          }

          const cw = canvas.width;
          const ch = canvas.height;
          if (!cw || !ch) { animId = requestAnimationFrame(loop); return; }

          const srcW = video.videoWidth  || 640;
          const srcH = video.videoHeight || 480;

          // ── Inference (only when a new video frame is available) ─────────
          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;

            // Pre-crop the video to the exact slot AR before inference.
            // Without this, MediaPipe squishes the full 16:9 frame to a 1:1
            // square, producing a mask that is horizontally compressed relative
            // to the 4:3 region actually displayed.
            const { sx, sy, sw, sh } = coverCrop(srcW, srcH, cw, ch);
            const procH = Math.round(PROC_W * ch / cw);

            if (!procCanvas) {
              procCanvas = document.createElement("canvas");
              procCtx    = procCanvas.getContext("2d")!;
            }
            if (procCanvas.width !== PROC_W || procCanvas.height !== procH) {
              procCanvas.width  = PROC_W;
              procCanvas.height = procH;
              smoothedMask = null; // reset temporal state on AR change
            }
            procCtx!.drawImage(video, sx, sy, sw, sh, 0, 0, PROC_W, procH);

            const result = segmenter.segmentForVideo(procCanvas, performance.now());
            const masks  = result.confidenceMasks;

            if (masks && masks.length > 0) {
              // Class 0 = background. Person alpha = 1 − background confidence.
              // The multiclass model captures hair/skin/clothes separately;
              // inverting class-0 merges them all in one step.
              const bgFloat = masks[0].getAsFloat32Array();
              const len     = bgFloat.length;
              const maskW   = masks[0].width;
              const maskH   = masks[0].height;

              if (!smoothedMask || smoothedMask.length !== len) {
                smoothedMask = new Float32Array(len);
                rgbaBuffer   = new Uint8ClampedArray(len * 4);
                maskCanvas   = new OffscreenCanvas(maskW, maskH);
                maskCtx      = maskCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
              }

              // EMA temporal smoothing + soft threshold + RGBA packing
              for (let i = 0; i < len; i++) {
                const raw = 1 - bgFloat[i];
                smoothedMask![i] = EMA_ALPHA * smoothedMask![i] + (1 - EMA_ALPHA) * raw;
                const a = Math.max(0, (smoothedMask![i] - ALPHA_THRESHOLD) / (1 - ALPHA_THRESHOLD));
                rgbaBuffer![i * 4]     = 255;
                rgbaBuffer![i * 4 + 1] = 255;
                rgbaBuffer![i * 4 + 2] = 255;
                rgbaBuffer![i * 4 + 3] = Math.min(255, Math.round(a * 255));
              }

              maskCtx!.putImageData(new ImageData(rgbaBuffer!, maskW, maskH), 0, 0);
              maskReady = true;
            }

            result.close();
          }

          // ── Composition ──────────────────────────────────────────────────
          const { sx, sy, sw, sh } = coverCrop(srcW, srcH, cw, ch);

          ctx.clearRect(0, 0, cw, ch);
          // CSS transform: scaleX(-1) on the canvas element handles mirroring
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);

          if (maskReady && maskCanvas) {
            ctx.save();
            ctx.filter = `blur(${FEATHER_PX}px)`;
            ctx.globalCompositeOperation = "destination-in";
            ctx.drawImage(maskCanvas as unknown as CanvasImageSource, 0, 0, cw, ch);
            ctx.restore();
          }

          animId = requestAnimationFrame(loop);
        };

        animId = requestAnimationFrame(loop);

      } catch (e) {
        console.error("[Segmentation] Init failed:", e);
      }
    };

    init();

    return () => {
      active = false;
      cancelAnimationFrame(animId);
      ro.disconnect();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (segmenter as any)?.close?.();
    };
  }, [enabled, videoRef]);

  return canvasRef;
}

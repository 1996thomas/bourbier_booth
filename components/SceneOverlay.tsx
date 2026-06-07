"use client"
import type React from "react";
import SceneDefault, { drawForCapture as drawDefault, WEBCAM_STYLE as webcamDefault } from "./scenes/SceneDefault";
import ScenePS2,    { drawForCapture as drawPS2,    WEBCAM_STYLE as webcamPS2,    drawBackground as drawBgPS2, WEBCAM_CAPTURE_RECT as webcamRectPS2, storyDecorator as decoratorPS2, SEG_CANVAS_STYLE as segCanvasStylePS2 } from "./scenes/ScenePS2";
import SceneMSN,    { drawForCapture as drawMSN,    WEBCAM_STYLE as webcamMSN,    WEBCAM_CAPTURE_RECT as webcamRectMSN, getWebcamCaptureRect as getMSNRect, drawBackground as drawBgMSN, storyDecorator as decoratorMSN } from "./scenes/SceneMSN";

export type SceneDrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export const SCENES = [
  { name: "Mirror", component: SceneDefault, draw: drawDefault, webcam: webcamDefault, drawBackground: undefined,  webcamRect: undefined,     getWebcamRect: undefined,  storyDecorator: undefined,    segmented: false, segCanvasStyle: undefined      },
  { name: "PS2",    component: ScenePS2,    draw: drawPS2,    webcam: webcamPS2,    drawBackground: drawBgPS2,   webcamRect: webcamRectPS2, getWebcamRect: undefined,  storyDecorator: decoratorPS2, segmented: true,  segCanvasStyle: segCanvasStylePS2 },
  { name: "MSN",    component: SceneMSN,    draw: drawMSN,    webcam: webcamMSN,    drawBackground: drawBgMSN,   webcamRect: webcamRectMSN, getWebcamRect: getMSNRect, storyDecorator: decoratorMSN,  segmented: false, segCanvasStyle: undefined      },
] as const satisfies ReadonlyArray<{
  name: string;
  component: React.ComponentType<{ captureFlash?: boolean }>;
  draw: SceneDrawFn;
  webcam: React.CSSProperties;
  drawBackground?: SceneDrawFn;
  webcamRect?: { x: number; y: number; w: number; h: number };
  getWebcamRect?: () => { x: number; y: number; w: number; h: number };
  storyDecorator?: string;
  segmented: boolean;
  segCanvasStyle?: React.CSSProperties;
}>;

export default function SceneOverlay({ sceneIndex, captureFlash }: { sceneIndex: number; captureFlash?: boolean }) {
  const Scene = SCENES[sceneIndex]?.component ?? SceneDefault;
  return <Scene captureFlash={captureFlash} />;
}

"use client"
import type React from "react";
import SceneDefault, { drawForCapture as drawDefault, WEBCAM_STYLE as webcamDefault } from "./scenes/SceneDefault";
import ScenePS2,    { drawForCapture as drawPS2,    WEBCAM_STYLE as webcamPS2,    drawBackground as drawBgPS2,  WEBCAM_CAPTURE_RECT as webcamRectPS2, storyDecorator as decoratorPS2, SEG_CANVAS_RECT as segCanvasRectPS2  } from "./scenes/ScenePS2";
import SceneMSN,    { drawForCapture as drawMSN,    WEBCAM_STYLE as webcamMSN,    drawBackground as drawBgMSN,  WEBCAM_CAPTURE_RECT as webcamRectMSN, getWebcamCaptureRect as getMSNRect,  storyDecorator as decoratorMSN       } from "./scenes/SceneMSN";
import SceneTest,   { drawForCapture as drawTest,   WEBCAM_STYLE as webcamTest,                                                                                                               SEG_CANVAS_RECT as segCanvasRectTest } from "./scenes/SceneTest";
import ScenePES,    { drawForCapture as drawPES,    WEBCAM_STYLE as webcamPES,    drawBackground as drawBgPES,  SEG_CANVAS_RECT as segCanvasRectPES, HEAD_CLIP as headClipPES, liveHeadClip as liveHeadClipPES, HEAD_SVG_PATH as headSvgPathPES, HEAD_SVG_VBW as headSvgVbWPES, HEAD_SVG_VBH as headSvgVbHPES } from "./scenes/ScenePES";

export type SceneDrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
export type SceneProps  = { captureFlash?: boolean; segCanvasRef?: React.RefObject<HTMLCanvasElement | null> };

export const SCENES = [
  { name: "Mirror", component: SceneDefault, draw: drawDefault, webcam: webcamDefault, drawBackground: undefined,  webcamRect: undefined,     getWebcamRect: undefined,  storyDecorator: undefined,    segmented: false, segCanvasRect: undefined,        headClip: undefined,   getLiveHeadClip: undefined,                       headSvgPath: undefined, headSvgVbW: undefined, headSvgVbH: undefined, cameraIndex: 0 },
  { name: "PS2",    component: ScenePS2,     draw: drawPS2,     webcam: webcamPS2,     drawBackground: drawBgPS2,  webcamRect: webcamRectPS2,  getWebcamRect: undefined,  storyDecorator: decoratorPS2, segmented: true,  segCanvasRect: segCanvasRectPS2, headClip: undefined,   getLiveHeadClip: undefined,                       headSvgPath: undefined, headSvgVbW: undefined, headSvgVbH: undefined, cameraIndex: 0 },
  { name: "MSN",    component: SceneMSN,     draw: drawMSN,     webcam: webcamMSN,     drawBackground: drawBgMSN,  webcamRect: webcamRectMSN,  getWebcamRect: getMSNRect, storyDecorator: decoratorMSN,  segmented: false, segCanvasRect: undefined,        headClip: undefined,   getLiveHeadClip: undefined,                       headSvgPath: undefined, headSvgVbW: undefined, headSvgVbH: undefined, cameraIndex: 0 },
  { name: "PES",    component: ScenePES,     draw: drawPES,     webcam: webcamPES,     drawBackground: drawBgPES,  webcamRect: undefined,      getWebcamRect: undefined,  storyDecorator: undefined,    segmented: true,  segCanvasRect: segCanvasRectPES, headClip: headClipPES, getLiveHeadClip: () => ({ ...liveHeadClipPES }), headSvgPath: headSvgPathPES, headSvgVbW: headSvgVbWPES, headSvgVbH: headSvgVbHPES, cameraIndex: 0 },
  { name: "Test",   component: SceneTest,    draw: drawTest,    webcam: webcamTest,    drawBackground: undefined,  webcamRect: undefined,      getWebcamRect: undefined,  storyDecorator: undefined,    segmented: true,  segCanvasRect: segCanvasRectTest, headClip: undefined,  getLiveHeadClip: undefined,                       headSvgPath: undefined, headSvgVbW: undefined, headSvgVbH: undefined, cameraIndex: 0 },
] as const satisfies ReadonlyArray<{
  name: string;
  component: React.ComponentType<SceneProps>;
  draw: SceneDrawFn;
  webcam: React.CSSProperties;
  drawBackground?: SceneDrawFn;
  webcamRect?: { x: number; y: number; w: number; h: number };
  getWebcamRect?: () => { x: number; y: number; w: number; h: number };
  storyDecorator?: string;
  segmented: boolean;
  segCanvasRect?: { x: number; y: number; w: number; h: number };
  headClip?: { x: number; y: number; w: number; h: number };
  getLiveHeadClip?: () => { x: number; y: number; w: number; h: number };
  headSvgPath?: string;
  headSvgVbW?: number;
  headSvgVbH?: number;
  cameraIndex: number;
}>;

export default function SceneOverlay({ sceneIndex, captureFlash, segCanvasRef }: {
  sceneIndex: number;
  captureFlash?: boolean;
  segCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}) {
  const Scene = SCENES[sceneIndex]?.component ?? SceneDefault;
  return <Scene captureFlash={captureFlash} segCanvasRef={segCanvasRef} />;
}

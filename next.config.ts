import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["onnxruntime-node"],

  // SharedArrayBuffer is required for MediaPipe's threaded WASM backend.
  // COOP + COEP enable the isolated context that unlocks it.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy",  value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;

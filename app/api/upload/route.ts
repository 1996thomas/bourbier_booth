import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { dataUrl } = await req.json() as { dataUrl: string };

  if (!dataUrl?.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }

  const base64 = dataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");

  const filename = `bourbier-${crypto.randomUUID()}.png`;

  const blob = await put(filename, buffer, {
    access: "private",
    contentType: "image/png",
  });

  const base =
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;

  const photoUrl = new URL("/photo", base);
  photoUrl.searchParams.set("url", blob.url);

  return NextResponse.json({ url: photoUrl.toString() });
}

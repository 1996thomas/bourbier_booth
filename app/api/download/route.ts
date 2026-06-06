import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOST = "vercel-storage.com";
const BLOB_API_VERSION = "12";

export async function GET(req: NextRequest) {
  const blobUrl = req.nextUrl.searchParams.get("url");

  if (!blobUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(blobUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!parsed.hostname.endsWith(ALLOWED_HOST)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;

  if (!token) {
    console.error("[download] BLOB_READ_WRITE_TOKEN absent");
    return NextResponse.json({ error: "Missing token" }, { status: 500 });
  }

  // Recopier les mêmes headers que le SDK @vercel/blob utilise en interne
  const res = await fetch(blobUrl, {
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-version": BLOB_API_VERSION,
      ...(storeId ? { "x-vercel-blob-store-id": storeId } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[download] ${res.status} ${res.statusText} — ${body}`);
    return NextResponse.json({ error: `Blob ${res.status}`, detail: body }, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  const forceDownload = req.nextUrl.searchParams.get("dl") === "1";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": forceDownload
        ? 'attachment; filename="bourbier_capture.png"'
        : "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

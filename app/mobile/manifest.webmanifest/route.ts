import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
  /\/$/,
  "",
);

export function GET() {
  const manifest: MetadataRoute.Manifest = {
    name: "Scheduly Mobile",
    short_name: "Scheduly",
    description: "La aplicación móvil de Scheduly",
    start_url: `${basePath}/mobile`,
    scope: `${basePath}/mobile`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#006fee",
    orientation: "portrait",
    icons: [
      {
        src: `${basePath}/mobile/icon/192`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/mobile/icon/512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/mobile/icon/512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/manifest+json",
    },
  });
}

import type { Metadata, Viewport } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
  /\/$/,
  "",
);

export const metadata: Metadata = {
  title: "Scheduly Mobile",
  description: "La aplicación móvil de Scheduly",
  manifest: `${basePath}/mobile/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scheduly",
  },
};

export const viewport: Viewport = {
  themeColor: "#006fee",
};

export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

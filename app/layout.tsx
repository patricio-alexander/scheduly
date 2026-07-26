import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/shared/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scheduly",
  description: "Sistema de agendamiento de turnos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem("scheduly.theme-colors");if(!r)return;var c=JSON.parse(r);var s=document.documentElement.style;function fg(h){var n=String(h||"").replace("#","");if(n.length!==6)return"#142014";var R=parseInt(n.slice(0,2),16),G=parseInt(n.slice(2,4),16),B=parseInt(n.slice(4,6),16);return (0.299*R+0.587*G+0.114*B)/255>0.55?"#142014":"#FFFFFF"}function set(k,v){if(v)s.setProperty(k,v)}if(c.accentColor){set("--accent",c.accentColor);set("--focus",c.accentColor);set("--accent-foreground",fg(c.accentColor))}if(c.successColor){set("--success",c.successColor);set("--success-foreground",fg(c.successColor))}if(c.warningColor){set("--warning",c.warningColor);set("--warning-foreground",fg(c.warningColor))}if(c.dangerColor){set("--danger",c.dangerColor);set("--danger-foreground",fg(c.dangerColor))}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

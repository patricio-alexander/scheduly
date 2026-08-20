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
            __html: `(function(){try{var keys=["scheduly.theme-colors.v3","scheduly.theme-colors.v2","scheduly.theme-colors"];var r=null;for(var i=0;i<keys.length;i++){r=localStorage.getItem(keys[i]);if(r)break}if(!r)return;var c=JSON.parse(r);var s=document.documentElement.style;function fg(h){var n=String(h||"").replace("#","");if(n.length!==6)return"#1A1408";var R=parseInt(n.slice(0,2),16),G=parseInt(n.slice(2,4),16),B=parseInt(n.slice(4,6),16);return (0.299*R+0.587*G+0.114*B)/255>0.55?"#1A1408":"#FFFFFF"}function set(k,v){if(v)s.setProperty(k,v)}var accent=c.accentColor;if(accent==="#7DFF7A"||accent==="#C8F542"||accent==="#F5C518")accent="#D4AF37";if(accent){set("--accent",accent);set("--focus",accent);set("--accent-foreground",fg(accent))}if(c.successColor){set("--success",c.successColor);set("--success-foreground",fg(c.successColor))}if(c.warningColor){set("--warning",c.warningColor);set("--warning-foreground",fg(c.warningColor))}if(c.dangerColor){set("--danger",c.dangerColor);set("--danger-foreground",fg(c.dangerColor))}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

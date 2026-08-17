import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Door to Door — Korea Journey Companion",
  description: "A bilingual live journey companion for Korea, from home and back.",
  other: { "codex-preview": "development" },
  manifest: "/manifest.webmanifest",
  applicationName: "Door to Door",
  appleWebApp: { capable: true, title: "Door to Door", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#12211d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}

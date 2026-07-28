import type { Metadata } from "next";
import { auth } from "@/auth";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toyota CCR Dashboard",
  description: "Production Planning and Inventory Control dashboard for Toyota CCR",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {`
try {
  if (localStorage.getItem("toyota-ccr-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch {}
          `.trim()}
        </Script>
      </head>
      <body className="min-h-full">
        <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}

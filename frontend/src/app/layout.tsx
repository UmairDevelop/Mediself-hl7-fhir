import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MediSelf — Clinician Portal",
  description: "Minimalist Apple-inspired Clinical Portal & FHIR Assistant",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={`${poppins.className} bg-[#f5f5f7] text-[#1d1d1f] antialiased selection:bg-[#0071e3]/20 selection:text-[#0071e3]`}>
        {children}
      </body>
    </html>
  );
}

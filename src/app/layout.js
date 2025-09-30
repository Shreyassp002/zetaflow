import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider, ToastProvider } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ZetaFlow Visualizer",
  description:
    "Real-time blockchain transaction flow visualization for ZetaChain network",
  keywords: [
    "blockchain",
    "visualization",
    "ZetaChain",
    "transactions",
    "DeFi",
  ],
  authors: [{ name: "ZetaFlow Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

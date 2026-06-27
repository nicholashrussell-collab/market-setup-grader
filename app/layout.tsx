import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Setup Grader v3.0",
  description: "Local paper-trading setup grader with live refresh and backtesting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

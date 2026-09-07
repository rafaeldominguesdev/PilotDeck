import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PilotDeck",
  description:
    "Self-hosted board for you and your AI agents. Data stays on this server.",
  robots: { index: false, follow: false },
  /**
   * The tab wears the monogram (OCL-37). The SVG leads because it is the only
   * one that can follow the browser's own light/dark chrome — it carries the
   * media query inside the file — and the two PNGs are the fallback for the
   * clients that will not take an SVG icon. All three are local files under
   * `public/brand/`: a self-hosted board fetches nothing, not even its mark.
   */
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/brand/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="devterm">
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}

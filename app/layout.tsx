import "../styles/globals.css";
import { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "Instagram Lead Engine – Pehchaan Media",
  description:
    "Internal tool to discover, qualify, score, and manage Instagram leads for the 7-Day Website Revenue Sprint."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}

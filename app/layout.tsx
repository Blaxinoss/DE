import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { VocabularyProvider } from "@/features/vocabulary/components/vocabulary-provider";
import { WebMcpTools } from "@/features/vocabulary/components/webmcp-tools";
import { WebVitals } from "@/components/web-vitals";
export const metadata: Metadata = {
  title: { default: "Wortweg", template: "%s · Wortweg" },
  description: "Move vocabulary from recognition to natural active use.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WebVitals />
        <VocabularyProvider>
          <WebMcpTools />
          <AppShell>{children}</AppShell>
        </VocabularyProvider>
      </body>
    </html>
  );
}

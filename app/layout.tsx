import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { VocabularyProvider } from "@/features/vocabulary/components/vocabulary-provider";
import { Toaster } from "sonner";
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
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          visibleToasts={4}
          gap={10}
          offset={16}
          mobileOffset={12}
          toastOptions={{
            duration: 4200,
            classNames: {
              toast: "wortweg-toast",
              title: "wortweg-toast-title",
              description: "wortweg-toast-description",
              closeButton: "wortweg-toast-close",
              actionButton: "wortweg-toast-action",
              cancelButton: "wortweg-toast-cancel",
              success: "wortweg-toast-success",
              error: "wortweg-toast-error",
              info: "wortweg-toast-info",
              warning: "wortweg-toast-warning",
            },
          }}
        />
        <VocabularyProvider>
          <AppShell>{children}</AppShell>
        </VocabularyProvider>
      </body>
    </html>
  );
}

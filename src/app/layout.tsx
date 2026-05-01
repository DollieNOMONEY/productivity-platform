import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { SprintProvider } from "@/lib/SprintContext";
import GlobalStickyPlayer from "@/components/global-sticky-player";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SprintProvider>
            {children}
            <GlobalStickyPlayer />
          </SprintProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

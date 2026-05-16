import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { SprintProvider } from "@/lib/SprintContext";
import GlobalStickyPlayer from "@/components/global-sticky-player";
import { MenuProvider } from "@/context/MenuContext";

import { Abhaya_Libre, Inter } from 'next/font/google';

export const font1 = Abhaya_Libre({
subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-font1',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter', 
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={font1.variable} suppressHydrationWarning>
      <body className={`antialiased bg-background text-foreground ${inter.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SprintProvider>
            <MenuProvider>
              {children}
            </MenuProvider>
            <GlobalStickyPlayer />
          </SprintProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
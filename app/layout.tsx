import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthSessionProvider } from '@/components/auth/auth-session-provider';
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Auto Video Generator',
    template: '%s | Auto Video Generator',
  },
  description:
    'AI-native video creation workspace for scripts, scenes, voice-overs, rendering, and publishing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}

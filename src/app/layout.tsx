import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spritely - AI Video to Game-Ready Animated Sprite Sheets',
  description:
    'Extract video frames, chroma key background, remove green halos, auto-crop with baseline anchoring, and export game-ready sprite sheets, PNG zips, and GIFs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

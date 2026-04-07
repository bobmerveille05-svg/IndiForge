import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IndiForge - Visual Trading Indicator Builder',
  description: 'Create custom trading indicators visually and export to Pine Script, MQL5, and more',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
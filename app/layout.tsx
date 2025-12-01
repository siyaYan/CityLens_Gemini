import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CityLens AR',
  description: 'Identify landmarks, fetch details, and generate immersive tours.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-white">{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import '../globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'PokiMate',
  description: 'Personal life OS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import { Nav } from './Nav';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'New Game Plus Podcast',
  description: 'Retro gaming podcast — searchable episode archive and Retro Master List',
};

const FOOTER_LINKS = [
  { label: 'Spotify', href: 'https://open.spotify.com/show/REPLACE_WITH_SHOW_ID' },
  { label: 'YouTube', href: 'https://www.youtube.com/REPLACE_WITH_CHANNEL_HANDLE' },
  { label: 'Apple Podcasts', href: 'https://podcasts.apple.com/REPLACE_WITH_SHOW_URL' },
  { label: 'Twitter/X', href: 'https://x.com/REPLACE_WITH_HANDLE' },
  { label: 'Discord', href: 'https://discord.gg/REPLACE_WITH_INVITE' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${plexSans.variable}`}>
      <body>
        <Nav />
        {children}
        <footer className="ngp-footer">
          <div className="ngp-footer-links">
            {FOOTER_LINKS.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="ngp-footer-copy">&copy; New Game Plus Podcast — a weekly retro gaming podcast</div>
        </footer>
      </body>
    </html>
  );
}

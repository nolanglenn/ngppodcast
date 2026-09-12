import type { Metadata } from 'next';
import { Nav } from './Nav';
import './globals.css';

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
    <html lang="en">
      <body>
        <Nav />
        {children}
        <footer>
          {FOOTER_LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </footer>
      </body>
    </html>
  );
}

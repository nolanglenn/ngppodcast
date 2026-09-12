'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/episodes', label: 'Episodes' },
  { href: '/retro-list', label: 'Retro Master List' },
  { href: '/about', label: 'About' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname() ?? '/';

  return (
    <div>
      <nav className="ngp-nav">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="New Game Plus Podcast"
            width={126}
            height={88}
            className="ngp-nav-logo"
            priority
          />
        </Link>
        <div className="ngp-nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="ngp-nav-link"
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="ngp-nav-underline" />
    </div>
  );
}

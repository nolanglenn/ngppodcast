import Link from 'next/link';

export function Nav() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/episodes">Episodes</Link>
      <Link href="/retro-list">Retro Master List</Link>
      <Link href="/about">About</Link>
    </nav>
  );
}

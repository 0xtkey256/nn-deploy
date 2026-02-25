'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/playground', label: 'Playground' },
  { href: '/inference', label: 'Inference' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      className="flex items-center justify-between px-6 h-14 border-b"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span style={{ color: 'var(--accent)' }}>nn</span>
          <span style={{ color: 'var(--text-muted)' }}>-</span>
          <span>deploy</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{
                color: pathname === item.href ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: pathname === item.href ? 'var(--bg-tertiary)' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <a
        href="https://github.com/0xtkey256/nn-deploy"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm px-3 py-1.5 rounded-md transition-colors"
        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        GitHub
      </a>
    </header>
  );
}

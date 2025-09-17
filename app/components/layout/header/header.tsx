import React from 'react';
import Link from 'next/link';
import styles from './header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/">
            <h1 className={styles.navLink}>google map app</h1>
          </Link>
        </div>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <li><Link href="/post" className={styles.navLink}>post</Link></li>
            <li><Link href="/about" className={styles.navLink}>about</Link></li>
            <li><Link href="/contact" className={styles.navLink}>contact</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

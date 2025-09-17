import React from 'react';
import Link from 'next/link';
import styles from './footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
          <Link href="/">
            <h3 className={styles.link}>google map app</h3>
          </Link>
            <p>Next.js と TypeScript で作成したブログです。</p>
          </div>
          <div className={styles.section}>
            <h4>リンク</h4>
            <ul className={styles.linkList}>
              <li><Link href="/post" className={styles.link}>post</Link></li>
              <li><Link href="/about" className={styles.link}>about</Link></li>
              <li><Link href="/contact" className={styles.link}>contact</Link></li>
            </ul>
          </div>
          <div className={styles.section}>
            <h4>Follow Us</h4>
            <ul className={styles.linkList}>
              <li><a href="#" className={styles.link}>Twitter</a></li>
              <li><a href="#" className={styles.link}>GitHub</a></li>
              <li><a href="#" className={styles.link}>LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>&copy; 2025 Next.js ブログ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

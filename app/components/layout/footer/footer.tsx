import React from 'react';
import Link from 'next/link';
import styles from './footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
            <h3>Next.js Blog</h3>
            <p>A modern blog built with Next.js and TypeScript</p>
          </div>
          <div className={styles.section}>
            <h4>リンク</h4>
            <ul className={styles.linkList}>
              <li><Link href="/" className={styles.link}>Home</Link></li>
              <li><Link href="/blog" className={styles.link}>Blog</Link></li>
              <li><Link href="/about" className={styles.link}>About</Link></li>
              <li><Link href="/contact" className={styles.link}>Contact</Link></li>
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
          <p>&copy; 2024 Next.js ブログ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

import { render, screen } from '@testing-library/react';
import Footer from './footer';

describe('Footer Component', () => {
  it('renders footer with site name', () => {
    render(<Footer />);
    expect(screen.getByText('Next.js Blog')).toBeInTheDocument();
  });

  it('renders footer description', () => {
    render(<Footer />);
    expect(screen.getByText('A modern blog built with Next.js and TypeScript')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Footer />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders social links', () => {
    render(<Footer />);
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('renders copyright notice', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2024 Next.js Blog/)).toBeInTheDocument();
  });
});

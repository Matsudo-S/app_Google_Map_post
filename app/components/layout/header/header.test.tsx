import { render, screen } from '@testing-library/react';
import Header from './header';

describe('Header Component', () => {
  it('renders header with logo', () => {
    render(<Header />);
    expect(screen.getByText('Next.js Blog')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Header />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('has correct navigation structure', () => {
    render(<Header />);
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });
});

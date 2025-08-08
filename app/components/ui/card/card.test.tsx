import { render, screen } from '@testing-library/react';
import Card from './card';

describe('Card Component', () => {
  it('renders card with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders card with title', () => {
    render(<Card title="Test Title">Card content</Card>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('does not render title when not provided', () => {
    render(<Card>Card content</Card>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Card content</Card>);
    const card = screen.getByText('Card content').parentElement;
    expect(card).toHaveClass('custom-class');
  });
});

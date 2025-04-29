import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import MoreTime from '../MoreTime';

describe('MoreTime', () => {
  it('renders the button', () => {
    render(<MoreTime />);
    expect(screen.getByRole('button', { name: /show more time modal/i })).toBeInTheDocument();
  });

  it('shows password prompt on button click', () => {
    render(<MoreTime />);
    fireEvent.click(screen.getByRole('button', { name: /show more time modal/i }));
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('shows wrong password message on submit', () => {
    render(<MoreTime />);
    fireEvent.click(screen.getByRole('button', { name: /show more time modal/i }));
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/wrong password/i)).toBeInTheDocument();
  });

  it('closes modal on close button click', () => {
    render(<MoreTime />);
    fireEvent.click(screen.getByRole('button', { name: /show more time modal/i }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByPlaceholderText(/password/i)).not.toBeInTheDocument();
  });

  it('accepts correct password and closes modal', async () => {
    render(<MoreTime />);
    fireEvent.click(screen.getByRole('button', { name: /show more time modal/i }));
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: process.env.REACT_APP_MORETIME_PASSWORD } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    // Uncomment the next line to debug the DOM if needed
    // screen.debug();
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/password/i)).not.toBeInTheDocument();
    });
  });

  it('updates password input value', () => {
    render(<MoreTime />);
    fireEvent.click(screen.getByRole('button', { name: /show more time modal/i }));
    const input = screen.getByPlaceholderText(/password/i);
    fireEvent.change(input, { target: { value: 'test' } });
    expect((input as HTMLInputElement).value).toBe('test');
  });
});

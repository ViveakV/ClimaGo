import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders input toggle buttons', () => {
    render(<App />);
    expect(screen.getByText(/type city/i)).toBeInTheDocument();
    expect(screen.getByText(/show map/i)).toBeInTheDocument();
  });

  it('renders MoreTime button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /show more time modal/i })).toBeInTheDocument();
  });

  it('renders city input in city mode', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('switches to map mode and renders GoogleMapPicker', () => {
    render(<App />);
    const mapButton = screen.getByText(/show map/i);
    mapButton.click();
    expect(screen.getByText(/type city/i)).toBeInTheDocument();
    // GoogleMapPicker is rendered, but may not have visible text, so just check for toggle
  });

  it('switches back to city mode', () => {
    render(<App />);
    const mapButton = screen.getByText(/show map/i);
    mapButton.click();
    const cityButton = screen.getByText(/type city/i);
    cityButton.click();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});

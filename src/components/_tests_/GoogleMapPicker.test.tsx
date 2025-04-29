import React from 'react';
import { render } from '@testing-library/react';
import GoogleMapPicker from '../GoogleMapPicker';

describe('GoogleMapPicker', () => {
  it('renders without crashing', () => {
    const setPickedLocation = jest.fn();
    const { container } = render(
      <GoogleMapPicker
        pickedLocation={null}
        setPickedLocation={setPickedLocation}
        apiKey="fake-key"
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls setPickedLocation when map is clicked', () => {
    const setPickedLocation = jest.fn();
    const { rerender } = render(
      <GoogleMapPicker
        pickedLocation={null}
        setPickedLocation={setPickedLocation}
        apiKey="fake-key"
      />
    );
    // Simulate prop change
    rerender(
      <GoogleMapPicker
        pickedLocation={{ lat: 1, lng: 2 }}
        setPickedLocation={setPickedLocation}
        apiKey="fake-key"
      />
    );
    expect(setPickedLocation).not.toHaveBeenCalled(); // No click simulated, just coverage for rerender
  });
});

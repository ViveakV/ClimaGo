import React, { useRef, useEffect, useState } from 'react';

interface Props {
  pickedLocation: { lat: number; lng: number } | null;
  setPickedLocation: (loc: { lat: number; lng: number }) => void;
  apiKey: string;
}

const GoogleMapPicker: React.FC<Props> = ({ pickedLocation, setPickedLocation, apiKey }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Track script loading globally to avoid duplicates
  // @ts-ignore
  if (typeof window !== 'undefined' && !(window as any)._googleMapsScriptLoading) {
    // @ts-ignore
    (window as any)._googleMapsScriptLoading = false;
  }

  useEffect(() => {
    // Only load script if not already loaded or loading
    // @ts-ignore
    if (!(window as any).google || !(window as any).google.maps) {
      // @ts-ignore
      if (!(window as any)._googleMapsScriptLoading) {
        // @ts-ignore
        (window as any)._googleMapsScriptLoading = true;
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setMapLoaded(true);
          // @ts-ignore
          (window as any)._googleMapsScriptLoading = false;
        };
        document.body.appendChild(script);
      } else {
        // Wait for script to load
        const interval = setInterval(() => {
          // @ts-ignore
          if ((window as any).google && (window as any).google.maps) {
            setMapLoaded(true);
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }
    } else {
      setMapLoaded(true);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    // @ts-ignore
    const google = window.google;
    const center = pickedLocation || { lat: 20, lng: 0 };
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: pickedLocation ? 8 : 2,
      disableDefaultUI: false,
    });

    // Place marker if pickedLocation exists
    if (pickedLocation) {
      markerRef.current = new google.maps.Marker({
        position: pickedLocation,
        map,
      });
    }

    // Add click listener to drop/move pin
    map.addListener('click', (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setPickedLocation({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map,
      });
    });

    // If pickedLocation changes, pan to it
    if (pickedLocation) {
      map.panTo(pickedLocation);
    }
  }, [mapLoaded, pickedLocation, setPickedLocation]);

  return (
    <div
      ref={mapRef}
      style={{ height: 300, width: '100%', borderRadius: 12 }}
    />
  );
};

export default GoogleMapPicker;
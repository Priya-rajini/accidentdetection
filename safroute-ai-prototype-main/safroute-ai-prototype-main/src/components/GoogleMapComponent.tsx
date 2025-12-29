import React, { useRef, useEffect } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

const render = (status: Status) => {
  return <h1>{status}</h1>;
};

const GoogleMapComponent: React.FC<{ lat: number; lng: number; zoom?: number }> = ({ lat, lng, zoom = 15 }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && window.google) {
      const map = new window.google.maps.Map(ref.current, {
        center: { lat, lng },
        zoom,
      });

      new window.google.maps.Marker({
        position: { lat, lng },
        map,
      });
    }
  }, [lat, lng, zoom]);

  return <div ref={ref} className="h-96 w-full" />;
};

const MapWithWrapper: React.FC<{ lat: number; lng: number; zoom?: number }> = (props) => {
  return (
    <Wrapper apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''} render={render}>
      <GoogleMapComponent {...props} />
    </Wrapper>
  );
};

export default MapWithWrapper;
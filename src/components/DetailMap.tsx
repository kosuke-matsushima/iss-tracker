import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { ISSPosition } from '../types/iss';
import { buildTrailSegments } from './mapUtils';

const CARTO_DARK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const CARTO_DARK_URL = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const issIcon = L.divIcon({
  className: 'iss-marker',
  html: `
    <div class="iss-marker-svg">
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="32" cy="32" r="13" fill="#00ffd5" fill-opacity="0.12" stroke="#00ffd5" stroke-width="2"/>
        <rect x="24" y="27" width="16" height="10" rx="2" fill="#d7fffb"/>
        <rect x="4" y="24" width="16" height="16" rx="2" fill="#00ffd5" fill-opacity="0.7"/>
        <rect x="44" y="24" width="16" height="16" rx="2" fill="#00ffd5" fill-opacity="0.7"/>
        <path d="M20 32H24M40 32H44M32 16V27M32 37V48" stroke="#00ffd5" stroke-width="3" stroke-linecap="round"/>
      </svg>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

type DetailMapProps = {
  position: ISSPosition | null;
  history: ISSPosition[];
};

function FollowCamera({ position }: { position: ISSPosition | null }) {
  const map = useMap();

  useEffect(() => {
    if (!position) {
      return;
    }

    map.flyTo([position.latitude, position.longitude], map.getZoom(), {
      animate: true,
      duration: 1.2,
    });
  }, [map, position]);

  return null;
}

function RefreshMapSize() {
  const map = useMap();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [map]);

  return null;
}

export function DetailMap({ position, history }: DetailMapProps) {
  const center = position
    ? ([position.latitude, position.longitude] as LatLngExpression)
    : ([20, 0] as LatLngExpression);
  const recentHistory = useMemo(() => history.slice(-20), [history]);
  const trailSegments = useMemo(() => buildTrailSegments(recentHistory), [recentHistory]);

  return (
    <section className="detail-panel detail-map-panel">
      <div className="detail-map-shell">
        <MapContainer
          center={center}
          zoom={6}
          minZoom={2}
          worldCopyJump
          zoomControl={false}
          scrollWheelZoom
          className="map-view detail-map"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution={CARTO_DARK_ATTRIBUTION}
            url={CARTO_DARK_URL}
          />
          <RefreshMapSize />
          <FollowCamera position={position} />
          {trailSegments.map((segment) => (
            <Polyline
              key={segment.id}
              positions={[
                [segment.start.latitude, segment.start.longitude],
                [segment.end.latitude, segment.end.longitude],
              ]}
              pathOptions={{
                color: segment.style.color,
                weight: segment.style.weight,
                opacity: segment.style.opacity,
                lineCap: 'round',
              }}
            />
          ))}
          {recentHistory.map((point, index) => {
            const progress = recentHistory.length > 1 ? index / (recentHistory.length - 1) : 1;
            const opacity = 0.16 + progress * 0.54;
            const fillColor = `rgb(${Math.round(68 * (1 - progress))}, ${Math.round(136 + (119 * progress))}, ${Math.round(255 - (42 * progress))})`;

            return (
              <CircleMarker
                key={point.timestamp}
                center={[point.latitude, point.longitude]}
                radius={2.5}
                pathOptions={{
                  stroke: false,
                  fillColor,
                  fillOpacity: opacity,
                }}
              />
            );
          })}
          {position ? (
            <Marker position={[position.latitude, position.longitude]} icon={issIcon} />
          ) : null}
        </MapContainer>
        <div className="detail-map-label">Regional detail</div>
      </div>
    </section>
  );
}

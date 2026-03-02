import { useEffect, useMemo, useRef } from 'react';
import Graphic from '@arcgis/core/Graphic';
import ArcGISMap from '@arcgis/core/Map';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import SceneView from '@arcgis/core/views/SceneView';
import type { ISSPosition } from '../types/iss';
import { buildTrailSegments } from './mapUtils';

type GlobeViewProps = {
  position: ISSPosition | null;
  history: ISSPosition[];
};

const GLOBE_CAMERA_ALTITUDE = 9_500_000;

const ISS_SVG = [
  '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">',
  '<circle cx="32" cy="32" r="13" fill="#00ffd5" fill-opacity="0.15" stroke="#00ffd5" stroke-width="2"/>',
  '<rect x="24" y="27" width="16" height="10" rx="2" fill="#d7fffb"/>',
  '<rect x="4" y="24" width="16" height="16" rx="2" fill="#00ffd5" fill-opacity="0.7"/>',
  '<rect x="44" y="24" width="16" height="16" rx="2" fill="#00ffd5" fill-opacity="0.7"/>',
  '<path d="M20 32H24M40 32H44M32 16V27M32 37V48" stroke="#00ffd5" stroke-width="3" stroke-linecap="round"/>',
  '</svg>',
].join('');

const ISS_ICON_URL = `data:image/svg+xml;base64,${btoa(ISS_SVG)}`;

function hexToRgba(value: string, alpha: number) {
  const normalized = value.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return [r, g, b, alpha] as [number, number, number, number];
}

export function GlobeView({ position, history }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<SceneView | null>(null);
  const markerGraphicRef = useRef<Graphic | null>(null);
  const trailLayerRef = useRef<GraphicsLayer | null>(null);
  const isReadyRef = useRef(false);
  const hasInitialGoToRef = useRef(false);
  const pendingPositionRef = useRef<ISSPosition | null>(null);

  const trailSegments = useMemo(
    () => buildTrailSegments(history, {
      startColor: '#1a3366',
      endColor: '#00ffd5',
      minWeight: 1.5,
      maxWeight: 4,
      minOpacity: 0.15,
      maxOpacity: 0.85,
      sampleEvery: 10,
      preserveRecentPoints: 100,
    }),
    [history],
  );

  useEffect(() => {
    if (!containerRef.current || viewRef.current) {
      return;
    }

    const map = new ArcGISMap({
      basemap: 'dark-gray-vector',
    });
    const trailLayer = new GraphicsLayer();
    const markerLayer = new GraphicsLayer();

    map.addMany([trailLayer, markerLayer]);

    // ISS icon marker using PointSymbol3D
    const markerGraphic = new Graphic({
      geometry: new Point({ latitude: 0, longitude: 0 }),
      symbol: {
        type: 'point-3d',
        symbolLayers: [{
          type: 'icon',
          size: 40,
          resource: { href: ISS_ICON_URL },
        }],
      } as __esri.PointSymbol3DProperties,
    });

    markerLayer.add(markerGraphic);

    const view = new SceneView({
      container: containerRef.current,
      map,
      camera: {
        position: {
          latitude: 20,
          longitude: 0,
          z: GLOBE_CAMERA_ALTITUDE,
        },
        tilt: 0,
        heading: 0,
      },
      environment: {
        background: {
          type: 'color',
          color: [4, 4, 11, 1],
        },
        starsEnabled: true,
        atmosphereEnabled: true,
      } as never,
      qualityProfile: 'high',
      ui: {
        components: [],
      },
    });

    viewRef.current = view;
    trailLayerRef.current = trailLayer;
    markerGraphicRef.current = markerGraphic;

    let cancelled = false;

    view.when(() => {
      if (cancelled) return;
      isReadyRef.current = true;
      view.on('mouse-wheel', (event) => event.stopPropagation());
      view.on('drag', (event) => event.stopPropagation());
      view.on('double-click', (event) => event.stopPropagation());
      view.on('immediate-double-click', (event) => event.stopPropagation());

      // Apply pending position and do initial goTo
      const pending = pendingPositionRef.current;
      if (pending) {
        const pt = new Point({
          latitude: pending.latitude,
          longitude: pending.longitude,
        });
        markerGraphic.geometry = pt;

        if (!hasInitialGoToRef.current) {
          hasInitialGoToRef.current = true;
          view.goTo({
            center: [pending.longitude, pending.latitude],
          }, { duration: 0 }).catch(() => {});
        }
      }
    }).catch(() => {
      isReadyRef.current = false;
    });

    return () => {
      cancelled = true;
      isReadyRef.current = false;
      hasInitialGoToRef.current = false;
      markerGraphicRef.current = null;
      trailLayerRef.current = null;
      viewRef.current = null;
      view.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update trail segments with LineSymbol3D
  useEffect(() => {
    const trailLayer = trailLayerRef.current;

    if (!trailLayer) {
      return;
    }

    trailLayer.removeAll();

    if (!trailSegments.length) {
      return;
    }

    const trailGraphics = trailSegments.map((segment) => new Graphic({
      geometry: new Polyline({
        paths: [[
          [segment.start.longitude, segment.start.latitude],
          [segment.end.longitude, segment.end.latitude],
        ]],
        spatialReference: {
          wkid: 4326,
        },
      }),
      symbol: {
        type: 'line-3d',
        symbolLayers: [{
          type: 'line',
          size: segment.style.weight,
          material: { color: hexToRgba(segment.style.color, segment.style.opacity) },
        }],
      } as __esri.LineSymbol3DProperties,
    }));

    trailLayer.addMany(trailGraphics);
  }, [trailSegments]);

  // Update marker position via geometry mutation (gated by isReadyRef)
  useEffect(() => {
    pendingPositionRef.current = position;

    const markerGraphic = markerGraphicRef.current;
    const view = viewRef.current;

    if (!position || !markerGraphic) {
      return;
    }

    markerGraphic.geometry = new Point({
      latitude: position.latitude,
      longitude: position.longitude,
    });

    // Initial goTo — center camera on ISS once, then keep fixed
    if (view && isReadyRef.current && !hasInitialGoToRef.current) {
      hasInitialGoToRef.current = true;
      view.goTo({
        center: [position.longitude, position.latitude],
      }, { duration: 0 }).catch(() => {});
    }
  }, [position]);

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-view globe-view" />
    </div>
  );
}

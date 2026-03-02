import type { ISSPosition } from '../types/iss';

function interpolateHex(start: string, end: string, t: number) {
  const parse = (value: string) => Number.parseInt(value, 16);
  const sr = parse(start.slice(1, 3));
  const sg = parse(start.slice(3, 5));
  const sb = parse(start.slice(5, 7));
  const er = parse(end.slice(1, 3));
  const eg = parse(end.slice(3, 5));
  const eb = parse(end.slice(5, 7));

  const mix = (from: number, to: number) => Math.round(from + (to - from) * t);
  return `#${[mix(sr, er), mix(sg, eg), mix(sb, eb)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

type TrailBuildOptions = {
  endColor?: string;
  minOpacity?: number;
  maxOpacity?: number;
  minWeight?: number;
  maxWeight?: number;
  preserveRecentPoints?: number;
  sampleEvery?: number;
  startColor?: string;
};

export type TrailSegment = {
  end: ISSPosition;
  id: string;
  progress: number;
  start: ISSPosition;
  style: {
    color: string;
    opacity: number;
    weight: number;
  };
};

export function buildTrailSegments(
  history: ISSPosition[],
  {
    startColor = '#4488ff',
    endColor = '#00ffd5',
    minOpacity = 0.1,
    maxOpacity = 0.6,
    minWeight = 1,
    maxWeight = 2,
    preserveRecentPoints = history.length,
    sampleEvery = 1,
  }: TrailBuildOptions = {},
): TrailSegment[] {
  if (history.length < 2) {
    return [];
  }

  const sampledHistory = history.filter((_, index) => {
    if (index === 0 || index === history.length - 1) {
      return true;
    }

    const recentStartIndex = Math.max(0, history.length - preserveRecentPoints);
    if (index >= recentStartIndex) {
      return true;
    }

    return index % Math.max(1, sampleEvery) === 0;
  });

  return sampledHistory.slice(1).flatMap((point, index) => {
    const prev = sampledHistory[index];
    const longitudeDelta = Math.abs(point.longitude - prev.longitude);

    if (longitudeDelta > 180) {
      return [];
    }

    const totalSegments = sampledHistory.length - 1;
    const progress = index / Math.max(1, totalSegments - 1);
    const weight = minWeight + (maxWeight - minWeight) * progress;
    const opacity = minOpacity + (maxOpacity - minOpacity) * progress;

    return {
      id: `${prev.timestamp}-${point.timestamp}`,
      start: prev,
      end: point,
      progress,
      style: {
        color: interpolateHex(startColor, endColor, progress),
        weight,
        opacity,
      },
    };
  });
}

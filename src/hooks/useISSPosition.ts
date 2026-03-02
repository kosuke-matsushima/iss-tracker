import { useEffect, useRef, useState } from 'react';
import type { ISSApiResponse, ISSPosition } from '../types/iss';

const POLL_INTERVAL_MS = 5000;
const MAX_HISTORY_POINTS = 3240;

type ISSHookState = {
  data: ISSApiResponse | null;
  position: ISSPosition | null;
  history: ISSPosition[];
  fetchCount: number;
  isLoading: boolean;
  error: string | null;
  msUntilNextFetch: number;
  lastUpdatedAt: number | null;
  pulseKey: number;
};

const initialState: ISSHookState = {
  data: null,
  position: null,
  history: [],
  fetchCount: 0,
  isLoading: true,
  error: null,
  msUntilNextFetch: POLL_INTERVAL_MS,
  lastUpdatedAt: null,
  pulseKey: 0,
};

export function useISSPosition() {
  const [state, setState] = useState<ISSHookState>(initialState);
  const nextFetchAtRef = useRef<number>(Date.now() + POLL_INTERVAL_MS);

  useEffect(() => {
    let isCancelled = false;

    const updateCountdown = () => {
      if (isCancelled) {
        return;
      }

      setState((prev) => ({
        ...prev,
        msUntilNextFetch: Math.max(0, nextFetchAtRef.current - Date.now()),
      }));
    };

    const fetchPosition = async () => {
      try {
        const response = await fetch('/api/iss-now.json');
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const json = (await response.json()) as ISSApiResponse;
        const nextPosition: ISSPosition = {
          latitude: Number(json.iss_position.latitude),
          longitude: Number(json.iss_position.longitude),
          timestamp: json.timestamp,
        };

        nextFetchAtRef.current = Date.now() + POLL_INTERVAL_MS;

        if (isCancelled) {
          return;
        }

        setState((prev) => ({
          data: json,
          position: nextPosition,
          history: [...prev.history, nextPosition].slice(-MAX_HISTORY_POINTS),
          fetchCount: prev.fetchCount + 1,
          isLoading: false,
          error: null,
          msUntilNextFetch: POLL_INTERVAL_MS,
          lastUpdatedAt: Date.now(),
          pulseKey: prev.pulseKey + 1,
        }));
      } catch (error) {
        nextFetchAtRef.current = Date.now() + POLL_INTERVAL_MS;

        if (isCancelled) {
          return;
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          msUntilNextFetch: POLL_INTERVAL_MS,
        }));
      }
    };

    nextFetchAtRef.current = Date.now() + POLL_INTERVAL_MS;
    void fetchPosition();

    const pollId = window.setInterval(() => {
      void fetchPosition();
    }, POLL_INTERVAL_MS);

    const countdownId = window.setInterval(updateCountdown, 100);

    return () => {
      isCancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(countdownId);
    };
  }, []);

  return {
    ...state,
    pollIntervalMs: POLL_INTERVAL_MS,
  };
}

import { CountdownBar } from './CountdownBar';
import { PulseEffect } from './PulseEffect';
import type { ISSApiResponse, ISSPosition } from '../types/iss';

type DataPanelProps = {
  data: ISSApiResponse | null;
  position: ISSPosition | null;
  fetchCount: number;
  msUntilNextFetch: number;
  pollIntervalMs: number;
  pulseKey: number;
  isLoading: boolean;
  error: string | null;
};

function formatJson(data: ISSApiResponse | null) {
  if (!data) {
    return null;
  }

  const json = JSON.stringify(data, null, 2);
  return json.split('\n').map((line, index) => {
    const keyMatch = line.match(/^(\s*)"([^"]+)":/);
    const valueMatch = line.match(/:\s(".*"|[\d.-]+|true|false|null)(,?)/);

    return (
      <div key={`${index}-${line}`} className="json-line">
        <span className="json-indent">{line.match(/^\s*/)?.[0] ?? ''}</span>
        {keyMatch ? <span className="json-key">"{keyMatch[2]}"</span> : null}
        {keyMatch ? <span className="json-punctuation">: </span> : null}
        {valueMatch ? (
          <span
            className={
              /^"/.test(valueMatch[1]) ? 'json-string' : 'json-number'
            }
          >
            {valueMatch[1]}
            {valueMatch[2]}
          </span>
        ) : (
          !keyMatch && <span className="json-punctuation">{line.trim()}</span>
        )}
      </div>
    );
  });
}

export function DataPanel({
  data,
  position,
  fetchCount,
  msUntilNextFetch,
  pollIntervalMs,
  pulseKey,
  isLoading,
  error,
}: DataPanelProps) {
  const formattedJson = formatJson(data);

  return (
    <aside className="data-panel">
      <PulseEffect pulseKey={pulseKey} />

      <section className="panel-section position-hero">
        <span className="eyebrow">Live Coordinates</span>
        <div className="position-grid">
          <div>
            <span className="stat-label">Latitude</span>
            <strong>{position ? position.latitude.toFixed(4) : '--.--'}</strong>
          </div>
          <div>
            <span className="stat-label">Longitude</span>
            <strong>{position ? position.longitude.toFixed(4) : '--.--'}</strong>
          </div>
        </div>
      </section>

      <section className="panel-section">
        <CountdownBar
          msRemaining={msUntilNextFetch}
          durationMs={pollIntervalMs}
        />
      </section>

      <section className="panel-section stats-grid">
        <div className="stat-card">
          <span className="stat-label">Fetch Count</span>
          <strong>{fetchCount}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Status</span>
          <strong>{error ? 'ERROR' : isLoading ? 'LOADING' : 'ONLINE'}</strong>
        </div>
      </section>

      <section className="panel-section">
        <div className="panel-heading">
          <span>Raw Response</span>
          {error ? <span className="error-chip">{error}</span> : null}
        </div>
        <pre className="json-viewer">
          {formattedJson ?? '{\n  "message": "waiting for first packet"\n}'}
        </pre>
      </section>
    </aside>
  );
}

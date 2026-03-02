import { DataPanel } from './components/DataPanel';
import { DetailMap } from './components/DetailMap';
import { GlobeView } from './components/GlobeView';
import { useISSPosition } from './hooks/useISSPosition';

export default function App() {
  const {
    data,
    position,
    history,
    fetchCount,
    isLoading,
    error,
    msUntilNextFetch,
    pulseKey,
    pollIntervalMs,
  } = useISSPosition();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Orbital Telemetry</p>
          <h1>ISS Real-Time Tracker</h1>
        </div>
        <div className="header-meta">
          <span>Last Update (UTC)</span>
          <strong>{data?.timestamp ? new Date(data.timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19) : '--'}</strong>
        </div>
      </header>

      <main className="app-main">
        <section className="map-panel">
          <GlobeView position={position} history={history} />
          {error ? <div className="status-banner error">{error}</div> : null}
          {isLoading ? <div className="status-banner">Acquiring telemetry...</div> : null}
        </section>

        <DetailMap position={position} history={history} />

        <DataPanel
          data={data}
          position={position}
          fetchCount={fetchCount}
          isLoading={isLoading}
          error={error}
          msUntilNextFetch={msUntilNextFetch}
          pulseKey={pulseKey}
          pollIntervalMs={pollIntervalMs}
        />
      </main>

      <footer className="app-footer">
        <p className="eyebrow">出典・協力</p>
        <p>
          本アプリは、NASAが公開する国際宇宙ステーション（ISS）のリアルタイム位置情報を
          Open Notify API 経由で5秒ごとに取得し、地球上の現在位置と軌跡を可視化しています。
        </p>
        <p>
          ISS位置情報 API:{' '}
          <a href="http://api.open-notify.org/iss-now.json" target="_blank" rel="noopener">
            Open Notify — ISS Current Location
          </a>
          {' '}(NASA / NORAD 追跡データに基づく)
        </p>
        <p>3Dグローブ: ArcGIS Maps SDK for JavaScript (Esri)</p>
        <p>地域マップ: CARTO / OpenStreetMap contributors</p>
      </footer>
    </div>
  );
}

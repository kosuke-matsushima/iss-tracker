type CountdownBarProps = {
  msRemaining: number;
  durationMs: number;
};

export function CountdownBar({ msRemaining, durationMs }: CountdownBarProps) {
  const progress = Math.max(0, Math.min(100, (msRemaining / durationMs) * 100));

  return (
    <div className="countdown-card">
      <div className="countdown-row">
        <span>Next refresh</span>
        <span>{(msRemaining / 1000).toFixed(1)}s</span>
      </div>
      <div className="countdown-track" aria-hidden="true">
        <div className="countdown-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

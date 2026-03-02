type PulseEffectProps = {
  pulseKey: number;
};

export function PulseEffect({ pulseKey }: PulseEffectProps) {
  return <div key={pulseKey} className="pulse-effect" aria-hidden="true" />;
}

export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card !p-5">
      <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-medium font-data text-text-primary">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-1">{sub}</div>}
    </div>
  );
}

export function UploadProgress({ percent, label }: { percent: number; label?: string }) {
  if (percent <= 0 && percent !== 0) return null;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#e6ddcd' }}>
        <div
          className="h-full rounded-full transition-all duration-200 ease-out"
          style={{ width: `${percent}%`, background: '#8a6d3b' }}
        />
      </div>
      <span className="text-xs text-[#8a7a66] tabular-nums shrink-0">{percent}%</span>
      {label && <span className="text-xs text-[#8a7a66] truncate">{label}</span>}
    </div>
  );
}

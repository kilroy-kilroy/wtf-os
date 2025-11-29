type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon?: string;
};

export function MetricCard({ label, value, helper, icon }: MetricCardProps) {
  return (
    <div className="bg-black border border-[#E51B23] rounded-lg px-4 py-3 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="font-anton text-[11px] uppercase tracking-wide text-[#B3B3B3]">
          {label}
        </span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="font-anton text-2xl text-[#FFDE59] mt-2">
        {value}
      </div>
      {helper && (
        <div className="text-[11px] text-[#777] mt-1 font-poppins">
          {helper}
        </div>
      )}
    </div>
  );
}

type TrendMetricCardProps = {
  label: string;
  valueChange: number;
  helper?: string;
};

export function TrendMetricCard({ label, valueChange, helper }: TrendMetricCardProps) {
  const sign = valueChange > 0 ? "+" : valueChange < 0 ? "–" : "";
  const color =
    valueChange > 0 ? "text-green-400" : valueChange < 0 ? "text-red-400" : "text-[#FFDE59]";

  return (
    <div className="bg-black border border-[#E51B23] rounded-lg px-4 py-3 flex flex-col justify-between">
      <span className="font-anton text-[11px] uppercase tracking-wide text-[#B3B3B3]">
        {label}
      </span>
      <div className={`font-anton text-2xl mt-2 ${color}`}>
        {Number.isFinite(valueChange) ? `${sign}${valueChange.toFixed(1)}` : "0.0"}
      </div>
      <div className="text-[11px] text-[#777] mt-1 font-poppins">
        {helper}
      </div>
    </div>
  );
}

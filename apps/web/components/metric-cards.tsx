import { InfoTooltip } from "@/components/ui/info-tooltip";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon?: string;
  tooltip?: string;
};

export function MetricCard({ label, value, helper, icon, tooltip }: MetricCardProps) {
  return (
    <div className="bg-black border border-[#E51B23] rounded-lg px-4 py-3 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-anton text-[11px] uppercase tracking-wide text-[#B3B3B3]">
            {label}
          </span>
          {tooltip && <InfoTooltip content={tooltip} iconClassName="h-3 w-3" />}
        </div>
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
  tooltip?: string;
};

export function TrendMetricCard({ label, valueChange, helper, tooltip }: TrendMetricCardProps) {
  const sign = valueChange > 0 ? "+" : valueChange < 0 ? "–" : "";
  const color =
    valueChange > 0 ? "text-green-400" : valueChange < 0 ? "text-red-400" : "text-[#FFDE59]";

  return (
    <div className="bg-black border border-[#E51B23] rounded-lg px-4 py-3 flex flex-col justify-between">
      <div className="flex items-center gap-1.5">
        <span className="font-anton text-[11px] uppercase tracking-wide text-[#B3B3B3]">
          {label}
        </span>
        {tooltip && <InfoTooltip content={tooltip} iconClassName="h-3 w-3" />}
      </div>
      <div className={`font-anton text-2xl mt-2 ${color}`}>
        {Number.isFinite(valueChange) ? `${sign}${valueChange.toFixed(1)}` : "0.0"}
      </div>
      <div className="text-[11px] text-[#777] mt-1 font-poppins">
        {helper}
      </div>
    </div>
  );
}

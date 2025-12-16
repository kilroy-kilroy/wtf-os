import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { getPatternByName } from "@/lib/patternGlossary";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon?: string;
  tooltip?: string;
  isPatternValue?: boolean;
};

export function MetricCard({ label, value, helper, icon, tooltip, isPatternValue }: MetricCardProps) {
  const patternDef = isPatternValue ? getPatternByName(value) : null;

  const valueElement = patternDef ? (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted underline-offset-4 decoration-[#555]">
            {value}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-[#1A1A1A] border border-[#333] text-sm">
          <p className="font-semibold text-[#FFDE59] mb-1">{patternDef.name}</p>
          <p className="text-[#B3B3B3]">{patternDef.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    value
  );

  return (
    <div className="bg-black border border-[#E51B23] rounded-lg px-4 py-3 flex flex-col h-full">
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
        {valueElement}
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
    <div className="bg-black border border-[#E51B23] rounded-lg px-4 py-3 flex flex-col h-full">
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

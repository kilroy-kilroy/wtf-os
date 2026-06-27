"use client";

import { useState } from "react";
import type { AgencyBrand } from "@repo/prompts";
import StartForm from "@/components/case-study-lab/StartForm";

type Phase = "start" | "interview";

export default function Flow() {
  const [phase, setPhase] = useState<Phase>("start");
  const [id, setId] = useState<string>("");
  const [brand, setBrand] = useState<AgencyBrand>({ colors: [], logoUrl: null });
  const [firstReply, setFirstReply] = useState<string>("");

  if (phase === "start") {
    return (
      <StartForm
        onStarted={(d) => {
          setId(d.id);
          setBrand(d.brand);
          setFirstReply(d.reply);
          setPhase("interview");
        }}
      />
    );
  }

  // Interview UI is added in Task 13; placeholder keeps the build green until then.
  return (
    <div className="text-white">
      <p className="mb-2 text-sm text-[#9aa0a6]">Interview started (id: {id})</p>
      <p>{firstReply}</p>
      {/* brand available for theming downstream */}
      <span className="hidden">{brand.colors.join(",")}</span>
    </div>
  );
}

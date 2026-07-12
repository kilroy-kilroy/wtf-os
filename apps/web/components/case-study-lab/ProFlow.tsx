"use client";

import { useState } from "react";
import type { AgencyBrand, Archetype, ProCaseStudySlots, RouterOutput } from "@repo/prompts";
import ProStartForm from "@/components/case-study-lab/ProStartForm";
import ProRouterCard from "@/components/case-study-lab/ProRouterCard";
import ProInterviewChat from "@/components/case-study-lab/ProInterviewChat";
import ProDraftEditor from "@/components/case-study-lab/ProDraftEditor";

type Phase = "start" | "route" | "interview" | "review";

export default function ProFlow() {
  const [phase, setPhase] = useState<Phase>("start");
  const [id, setId] = useState("");
  const [brand, setBrand] = useState<AgencyBrand>({ colors: [], logoUrl: null, name: null });
  const [recommendation, setRecommendation] = useState<RouterOutput | null>(null);
  const [archetype, setArchetype] = useState<Archetype>("proof");
  const [firstReply, setFirstReply] = useState("");
  const [initialReady, setInitialReady] = useState(false);
  const [slots, setSlots] = useState<ProCaseStudySlots | null>(null);
  const [beginning, setBeginning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chooseArchetype(a: Archetype) {
    setBeginning(true);
    setError(null);
    try {
      const res = await fetch("/api/case-study-lab-pro/begin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, archetype: a }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something broke");
      setArchetype(a);
      setFirstReply(json.reply);
      setInitialReady(Boolean(json.readyToGenerate));
      setSlots(json.slots ?? null);
      setPhase("interview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
    } finally {
      setBeginning(false);
    }
  }

  if (phase === "start") {
    return (
      <ProStartForm
        onClassified={(d) => {
          setId(d.id);
          setBrand(d.brand);
          setRecommendation(d.recommendation);
          setPhase("route");
        }}
      />
    );
  }

  if (phase === "route" && recommendation) {
    return (
      <div className="flex flex-col gap-3">
        <ProRouterCard recommendation={recommendation} busy={beginning} onChosen={chooseArchetype} />
        {error && <p className="text-sm text-[#E51B23]">{error}</p>}
      </div>
    );
  }

  if (phase === "interview") {
    return (
      <ProInterviewChat
        id={id}
        firstReply={firstReply}
        initialReady={initialReady}
        onReady={(s) => {
          setSlots(s);
          setPhase("review");
        }}
      />
    );
  }

  return (
    <ProDraftEditor
      id={id}
      archetype={archetype}
      slots={slots!}
      brand={brand}
      // Hard navigation to the finished report (same reasoning as the free Flow).
      onDone={() => {
        window.location.href = `/case-study-lab-pro/r/${id}`;
      }}
    />
  );
}

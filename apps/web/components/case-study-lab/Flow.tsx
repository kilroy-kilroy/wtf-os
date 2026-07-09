"use client";

import { useState } from "react";
import type { AgencyBrand, CaseStudySlots } from "@repo/prompts";
import StartForm from "@/components/case-study-lab/StartForm";
import InterviewChat from "@/components/case-study-lab/InterviewChat";
import DraftEditor from "@/components/case-study-lab/DraftEditor";

type Phase = "start" | "interview" | "review";

export default function Flow() {
  const [phase, setPhase] = useState<Phase>("start");
  const [id, setId] = useState<string>("");
  const [firstReply, setFirstReply] = useState<string>("");
  const [slots, setSlots] = useState<CaseStudySlots | null>(null);
  // brand is captured for potential future theming of the live UI; not yet used.
  const [, setBrand] = useState<AgencyBrand>({ colors: [], logoUrl: null });

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

  if (phase === "interview") {
    return (
      <InterviewChat
        id={id}
        firstReply={firstReply}
        onReady={(s) => {
          setSlots(s);
          setPhase("review");
        }}
      />
    );
  }

  return (
    <DraftEditor
      id={id}
      slots={slots!}
      // Hard navigation to the finished report. A soft router.push to this
      // force-dynamic page could fetch the RSC payload without visibly
      // committing, stranding the user on the "GENERATING…" screen while the
      // report already exists. A full load always lands on the rendered page.
      onDone={() => {
        window.location.href = `/case-study-lab/r/${id}`;
      }}
    />
  );
}

import type { Archetype } from "@repo/prompts";
import {
  buildCaseStudyView,
  buildTransformationView,
  buildBigIdeaView,
  buildMethodView,
  buildCraftView,
} from "@/lib/case-study-lab/view";
import ReportBody from "@/components/case-study-lab/ReportBody";
import TransformationTemplate from "@/components/case-study-lab/TransformationTemplate";
import BigIdeaTemplate from "@/components/case-study-lab/BigIdeaTemplate";
import MethodTemplate from "@/components/case-study-lab/MethodTemplate";
import CraftTemplate from "@/components/case-study-lab/CraftTemplate";

// Renders a finished Pro report with the template that matches its archetype.
// `report` is the stored row (loosely typed at the view boundary, like the
// free tool's report page).
export default function ProReport({ report }: { report: any }) {
  const archetype = report?.archetype as Archetype;
  switch (archetype) {
    case "transformation":
      return <TransformationTemplate view={buildTransformationView(report)} />;
    case "big_idea":
      return <BigIdeaTemplate view={buildBigIdeaView(report)} />;
    case "method":
      return <MethodTemplate view={buildMethodView(report)} />;
    case "craft":
      return <CraftTemplate view={buildCraftView(report)} />;
    case "proof":
    default:
      return <ReportBody view={buildCaseStudyView(report)} />;
  }
}

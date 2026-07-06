import { NODES } from "@repo/prompts";

const LAST_NODE = NODES[NODES.length - 1].id; // 6

export type InterviewState = { currentNode: number; pushed: boolean };
export type Classification = { satisfied: boolean };
export type InterviewMove = {
  action: "push" | "advance" | "complete";
  nextNode: number;
  pushed: boolean;
  interviewComplete: boolean;
};

export function advanceInterview(state: InterviewState, c: Classification): InterviewMove {
  // Push exactly once per node: unsatisfied AND we have not pushed yet → stay, mark pushed.
  if (!c.satisfied && !state.pushed) {
    return { action: "push", nextNode: state.currentNode, pushed: true, interviewComplete: false };
  }
  // Otherwise move on (satisfied, or unsatisfied-but-already-pushed → take what you get).
  const nextNode = state.currentNode + 1;
  if (state.currentNode >= LAST_NODE) {
    return { action: "complete", nextNode, pushed: false, interviewComplete: true };
  }
  return { action: "advance", nextNode, pushed: false, interviewComplete: false };
}

import { describe, it, expect } from "vitest";
import { advanceInterview } from "@/lib/robot-tim/state-machine";

describe("advanceInterview", () => {
  it("advances to the next node when satisfied", () => {
    const r = advanceInterview({ currentNode: 0, pushed: false }, { satisfied: true });
    expect(r).toEqual({ action: "advance", nextNode: 1, pushed: false, interviewComplete: false });
  });

  it("pushes (stays on the node) when not satisfied and not yet pushed", () => {
    const r = advanceInterview({ currentNode: 0, pushed: false }, { satisfied: false });
    expect(r).toEqual({ action: "push", nextNode: 0, pushed: true, interviewComplete: false });
  });

  it("advances anyway when not satisfied but already pushed (take what you get)", () => {
    const r = advanceInterview({ currentNode: 0, pushed: true }, { satisfied: false });
    expect(r).toEqual({ action: "advance", nextNode: 1, pushed: false, interviewComplete: false });
  });

  it("never pushes twice on the same node", () => {
    const r = advanceInterview({ currentNode: 3, pushed: true }, { satisfied: false });
    expect(r.action).toBe("advance");
  });

  it("completes when satisfied on the last node (id 6)", () => {
    const r = advanceInterview({ currentNode: 6, pushed: false }, { satisfied: true });
    expect(r).toEqual({ action: "complete", nextNode: 7, pushed: false, interviewComplete: true });
  });

  it("completes when pushed-out on the last node", () => {
    const r = advanceInterview({ currentNode: 6, pushed: true }, { satisfied: false });
    expect(r.action).toBe("complete");
    expect(r.interviewComplete).toBe(true);
  });
});

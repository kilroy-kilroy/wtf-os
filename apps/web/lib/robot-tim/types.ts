// apps/web/lib/robot-tim/types.ts
export type Answer = {
  nodeId: number;
  raw: string;
  classification: "results" | "process" | "generic" | "real";
  reaction: string;
};

// `title` and `excerpt` are carried so synthesis can quote what a page actually says.
// Without them the makeover prompt received only a URL and a score and had to infer each
// page's content from its slug, which is why its punch list read the same for every page.
export type CrawlPage = {
  url: string;
  score: number;
  flags: unknown[];
  title?: string;
  excerpt?: string;
};
// `error` is set only when the crawl failed and we stored an empty result so synthesis
// could still run. Its presence is what separates "this site genuinely had nothing to
// read" from "we never actually read the site" — without it a failed run is
// indistinguishable from a successful one downstream.
export type Crawl = { pages: CrawlPage[]; homepageText: string; error?: string };

export type Spine = {
  whoFor: string;
  whoNotFor: string;
  problemTheyThink: string;
  problemTheyHave: string;
  valueNotBought: string;
  traps: string[];
  headlines: string[];
  vvvOneLiner: string;
};

export type Makeover = {
  beforeHero: string;
  afterHero: string;
  punchList: { url: string; fixes: string[] }[];
};

export type Node7 = { punchList: string[]; ladder: string };

export type RobotTimSession = {
  id: string;
  email: string | null;
  first_name: string | null;
  site_url: string;
  status: "interviewing" | "synthesizing" | "complete" | "failed";
  stripe_session_id: string | null;
  current_node: number;
  pushed: boolean;
  interview_complete: boolean;
  answers: Answer[];
  crawl: Crawl | null;
  spine: Spine | null;
  makeover: Makeover | null;
  node7: Node7 | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

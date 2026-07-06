import { z } from "zod";

export const ClassifyResultSchema = z.object({
  classification: z.enum(["results", "process", "generic", "real"]),
  reaction: z.string(),
  satisfied: z.boolean(),
});
export type ClassifyResult = z.infer<typeof ClassifyResultSchema>;

export const SpineSchema = z.object({
  whoFor: z.string(),
  whoNotFor: z.string(),
  problemTheyThink: z.string(),
  problemTheyHave: z.string(),
  valueNotBought: z.string(),
  traps: z.array(z.string()),
  headlines: z.array(z.string()),
  vvvOneLiner: z.string(),
});

export const MakeoverSchema = z.object({
  beforeHero: z.string(),
  afterHero: z.string(),
  punchList: z.array(z.object({ url: z.string(), fixes: z.array(z.string()) })),
});

export const Node7Schema = z.object({
  punchList: z.array(z.string()),
  ladder: z.string(),
});

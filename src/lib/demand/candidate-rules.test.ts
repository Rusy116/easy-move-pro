import { describe, expect, it } from "vitest";
import { evaluateSignal, type GscSignal } from "./candidate-rules";

const cities = new Set<string>(["nashville", "boston", "long beach", "prince frederick"]);

function ev(query: string) {
  const signal: GscSignal = {
    id: "test",
    query,
    query_norm: query,
    impressions: 10,
    clicks: 0,
    ctr: 0,
    avg_position: 30,
    window_start: "2026-08-10",
    window_end: "2026-08-31",
  };
  return evaluateSignal(signal, cities);
}

describe("DD-4B service-intent calibration", () => {
  const rejected = [
    "apartment movers",
    "apartment mover",
    "local movers",
    "moving company",
    "moving companies",
    "house movers",
    "long distance movers",
    "office movers",
    "residential movers",
    "commercial movers",
    "piano movers",
    "same day movers",
  ];
  for (const q of rejected) {
    it(`rejects service intent: ${q}`, () => {
      expect(ev(q).accepted).toBe(false);
    });
  }

  const accepted: Array<[string, string]> = [
    ["apartment movers cost", "moving_cost_planner"],
    ["moving checklist", "moving_checklist"],
    ["packing checklist", "packing_checklist"],
    ["moving budget template", "moving_budget"],
    ["moving inventory list", "home_inventory"],
    ["how much do movers cost", "moving_cost_planner"],
    ["moving company cost calculator", "moving_cost_planner"],
    ["address change checklist", "address_change"],
    ["utility transfer checklist", "utility_transfer"],
    ["moving timeline", "moving_timeline"],
    ["apartment moving checklist", "moving_checklist"],
    ["apartment move planner", "apartment_move_planner"],
  ];
  for (const [q, fit] of accepted) {
    it(`accepts ${q} as ${fit}`, () => {
      const r = ev(q);
      expect(r.accepted).toBe(true);
      if (r.accepted) expect(r.productFit).toBe(fit);
    });
  }
});

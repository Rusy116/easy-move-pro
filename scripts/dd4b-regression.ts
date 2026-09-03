// DD-4B deterministic regression matrix. Run: bun scripts/dd4b-regression.ts
import { evaluateSignal, type GscSignal } from "../src/lib/demand/candidate-rules";

const cities = new Set(["nashville", "boston", "long beach", "prince frederick"]);
const ev = (query: string) =>
  evaluateSignal(
    { id: "t", query, query_norm: query, impressions: 10, clicks: 0, ctr: 0, avg_position: 30, window_start: "2026-08-10", window_end: "2026-08-31" } as GscSignal,
    cities,
  );

const reject = ["apartment movers","apartment mover","local movers","moving company","moving companies","house movers","long distance movers","office movers","residential movers","commercial movers","piano movers","same day movers"];
const accept: Array<[string, string]> = [["apartment movers cost","moving_cost_planner"],["moving checklist","moving_checklist"],["packing checklist","packing_checklist"],["moving budget template","moving_budget"],["moving inventory list","home_inventory"],["how much do movers cost","moving_cost_planner"],["moving company cost calculator","moving_cost_planner"],["address change checklist","address_change"],["utility transfer checklist","utility_transfer"],["moving timeline","moving_timeline"],["apartment moving checklist","moving_checklist"],["apartment move planner","apartment_move_planner"]];

let failed = 0;
for (const q of reject) {
  const r = ev(q);
  const ok = !r.accepted;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} reject  ${q} -> ${r.accepted ? r.productFit : r.reason}`);
}
for (const [q, fit] of accept) {
  const r = ev(q);
  const ok = r.accepted && r.productFit === fit;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} accept  ${q} -> ${r.accepted ? r.productFit : r.reason}`);
}
console.log(failed === 0 ? "ALL PASS" : `${failed} FAILED`);

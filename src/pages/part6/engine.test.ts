import { describe, it, expect } from 'vitest';
import { schedule, evaluate, topo, addWD, today, fmt, Task } from './engine';
import { TASKS, EDGES, SEED_SCENARIOS } from './mock';
const d = (n: number) => fmt(addWD(today(), n));
const mk = (id: number, s: number, duration: number): Task => ({ id, name: 't' + id, status: 'not_started', assignee: 'x', start: d(s), duration });
const chain = [mk(1, 1, 2), mk(2, 3, 2), mk(3, 5, 1), mk(4, 1, 3)];
const e = [{ source: 1, target: 2 }, { source: 2, target: 3 }];
describe('engine', () => {
  it('delaying an upstream task shifts dependents with no slack', () => {
    const a = schedule(chain, e), b = schedule(chain, e, { type: 'delay', taskId: 1, days: 2 });
    expect(b.get(3)!.end.getTime()).toBeGreaterThan(a.get(3)!.end.getTime());
  });
  it('unrelated task is unaffected', () => {
    const a = schedule(chain, e), b = schedule(chain, e, { type: 'delay', taskId: 1, days: 2 });
    expect(b.get(4)!.end.getTime()).toBe(a.get(4)!.end.getTime());
  });
  it('rejects cycles', () => { expect(() => topo(chain.slice(0, 2), [{ source: 1, target: 2 }, { source: 2, target: 1 }])).toThrow(/cycle/i); });
  it('resolving the blocker earlier moves the demo completion date', () => {
    const r = evaluate(TASKS, EDGES, SEED_SCENARIOS[0].change);
    expect(r.deltaDays).toBeLessThan(0);
  });
});

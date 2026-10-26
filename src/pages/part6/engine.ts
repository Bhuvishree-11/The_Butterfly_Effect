// Client-side scheduling engine (no backend). Working-day calendar: Mon-Fri.
export type Status = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export interface Task { id: number; name: string; status: Status; assignee: string; start: string; duration: number; actualEnd?: string; blockedUntil?: string; deadline?: string; deadlineLabel?: string }
export interface Edge { source: number; target: number } // target depends on source (finish-to-start)
export type ChangeType = 'delay' | 'complete_today' | 'reduce_duration' | 'prioritise';
export interface Change { type: ChangeType; taskId: number; days: number }
export interface Scenario { id: string; name: string; change: Change; note: string }
export interface Slot { start: Date; end: Date }

export const DAY = 86400000;
export const parse = (s: string) => new Date(s + 'T00:00:00Z');
export const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
const isWork = (d: Date) => d.getUTCDay() % 6 !== 0;
export function nextWork(d: Date) { const r = new Date(d); while (!isWork(r)) r.setUTCDate(r.getUTCDate() + 1); return r; }
export function addWD(d: Date, n: number) {
  const r = new Date(d); const s = n < 0 ? -1 : 1; let k = Math.abs(n);
  while (k > 0) { r.setUTCDate(r.getUTCDate() + s); if (isWork(r)) k--; }
  return r;
}
export function wdDiff(a: Date, b: Date) {
  if (a.getTime() === b.getTime()) return 0;
  const s = b > a ? 1 : -1; let n = 0; const c = new Date(a);
  while (c.getTime() !== b.getTime()) { c.setUTCDate(c.getUTCDate() + s); if (isWork(c)) n += s; }
  return n;
}

export function topo(tasks: Task[], edges: Edge[]) {
  const indeg = new Map(tasks.map(t => [t.id, 0]));
  edges.forEach(e => indeg.set(e.target, (indeg.get(e.target) || 0) + 1));
  const q = tasks.filter(t => !indeg.get(t.id)).map(t => t.id); const out: number[] = [];
  while (q.length) {
    const id = q.shift()!; out.push(id);
    edges.filter(e => e.source === id).forEach(e => { const v = (indeg.get(e.target) || 0) - 1; indeg.set(e.target, v); if (v === 0) q.push(e.target); });
  }
  if (out.length !== tasks.length) throw new Error('Dependency cycle detected');
  return out;
}

export function reach(id: number, edges: Edge[], dir: 'down' | 'up') {
  const seen = new Set<number>(); const st = [id];
  while (st.length) {
    const c = st.pop()!;
    edges.forEach(e => { const [a, b] = dir === 'down' ? [e.source, e.target] : [e.target, e.source]; if (a === c && !seen.has(b)) { seen.add(b); st.push(b); } });
  }
  return seen;
}

export function schedule(tasks: Task[], edges: Edge[], ch?: Change) {
  const T = today(), byId = new Map(tasks.map(t => [t.id, t])), slots = new Map<number, Slot>();
  for (const id of topo(tasks, edges)) {
    const t = byId.get(id)!; const mine = ch && ch.taskId === id ? ch : undefined;
    let dur = t.duration, start = nextWork(parse(t.start));
    if (t.status === 'completed' && t.actualEnd) { slots.set(id, { start, end: parse(t.actualEnd) }); continue; }
    const preds = edges.filter(e => e.target === id).map(e => slots.get(e.source)!.end);
    const predOk = preds.length ? addWD(preds.reduce((a, b) => (a > b ? a : b)), 1) : null;
    const started = t.status === 'in_progress';
    if (!started) {
      if (predOk && predOk > start) start = predOk;
      if (start < T) start = nextWork(T);
      if (t.status === 'blocked' && t.blockedUntil && mine?.type !== 'prioritise') { const b = nextWork(parse(t.blockedUntil)); if (b > start) start = b; }
      if (mine?.type === 'prioritise') { const early = predOk ?? nextWork(T); start = early > nextWork(T) ? early : nextWork(T); }
    }
    if (mine?.type === 'complete_today') { slots.set(id, { start, end: T > start ? T : start }); continue; }
    if (mine?.type === 'delay') { if (started) dur += mine.days; else start = addWD(start, mine.days); }
    if (mine?.type === 'reduce_duration') dur = Math.max(1, dur - mine.days);
    let end = addWD(start, dur - 1);
    if (started && end < T) end = T; // still running past plan
    slots.set(id, { start, end });
  }
  return slots;
}

export function evaluate(tasks: Task[], edges: Edge[], ch?: Change) {
  const base = schedule(tasks, edges), s = ch ? schedule(tasks, edges, ch) : base;
  const sinks = tasks.filter(t => !edges.some(e => e.source === t.id)).map(t => t.id);
  const last = (m: Map<number, Slot>) => sinks.map(i => m.get(i)!.end).reduce((a, b) => (a > b ? a : b));
  const completion = last(s), baselineCompletion = last(base);
  const affected = tasks.map(t => ({ id: t.id, name: t.name, delta: wdDiff(base.get(t.id)!.end, s.get(t.id)!.end) })).filter(a => a.delta !== 0);
  const missed = tasks.filter(t => t.deadline && s.get(t.id)!.end > parse(t.deadline))
    .map(t => ({ name: t.deadlineLabel || t.name, due: t.deadline!, projected: fmt(s.get(t.id)!.end) }));
  const stillBlocked = tasks.filter(t => t.status === 'blocked' && !(ch && ch.taskId === t.id && (ch.type === 'prioritise' || ch.type === 'complete_today'))).map(t => t.name);
  let cur = sinks.reduce((a, b) => (s.get(a)!.end >= s.get(b)!.end ? a : b)); const critical = [cur];
  for (;;) {
    const ps = edges.filter(e => e.target === cur).map(e => e.source); if (!ps.length) break;
    cur = ps.reduce((a, b) => (s.get(a)!.end >= s.get(b)!.end ? a : b)); critical.unshift(cur);
  }
  return {
    base, slots: s, completion, baselineCompletion, deltaDays: wdDiff(baselineCompletion, completion), affected,
    tasksDelayed: affected.filter(a => a.delta > 0).length,
    downstreamAffected: affected.filter(a => !ch || a.id !== ch.taskId).length,
    missed, stillBlocked, critical,
  };
}
export type Result = ReturnType<typeof evaluate>;

export const CHANGE_LABEL: Record<ChangeType, string> = {
  delay: 'Delay task', complete_today: 'Complete task today', reduce_duration: 'Reduce task duration', prioritise: 'Resolve / start task earlier',
};
export const ASSUMPTIONS = [
  'Working-day calendar (Mon-Fri); no holidays modelled.',
  'Finish-to-start dependencies: a task starts the working day after all prerequisites finish.',
  'Completed tasks keep their recorded dates; unfinished tasks cannot start before today.',
  'Only the change you enter is applied. No staffing or resource effects are assumed.',
  'Results are a simulated scenario (projected impact), not a prediction. Nothing here changes real task data.',
];

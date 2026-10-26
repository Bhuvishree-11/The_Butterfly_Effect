import { useMemo, useState } from 'react';
import { Task, Edge, Change, ChangeType, Scenario, CHANGE_LABEL, ASSUMPTIONS, evaluate, fmt, DAY, Result } from '../part6/engine';

interface Props { tasks: Task[]; edges: Edge[]; initialTaskId?: number | null; onSave: (s: Scenario) => void }
export default function Simulator({ tasks, edges, initialTaskId, onSave }: Props) {
  const open = tasks.filter(t => t.status !== 'completed');
  const [taskId, setTaskId] = useState<number>(initialTaskId ?? open[0]?.id ?? tasks[0].id);
  const [type, setType] = useState<ChangeType>('delay');
  const [days, setDays] = useState(3);
  const [res, setRes] = useState<{ r: Result; ch: Change } | null>(null);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const task = tasks.find(t => t.id === taskId)!;
  const invalid = type === 'complete_today' && task.status === 'not_started';
  const needsDays = type === 'delay' || type === 'reduce_duration';

  function run() { const ch = { type, taskId, days: needsDays ? days : 0 }; setRes({ r: evaluate(tasks, edges, ch), ch }); setName(`${CHANGE_LABEL[type]}: ${task.name}${needsDays ? ` (${days}d)` : ''}`); setSaved(false); }
  function save() {
    if (!res) return;
    onSave({ id: Date.now().toString(36), name: name || 'Untitled scenario', change: res.ch, note: `Intervention: ${CHANGE_LABEL[res.ch.type].toLowerCase()} on ${task.name}${needsDays ? ` by ${res.ch.days} working days` : ''}.` });
    setSaved(true);
  }
  const range = useMemo(() => {
    if (!res) return null;
    const all = [...res.r.base.values(), ...res.r.slots.values()];
    const min = Math.min(...all.map(s => s.start.getTime())), max = Math.max(...all.map(s => s.end.getTime()));
    const span = (max - min) / DAY + 1;
    const bar = (s: { start: Date; end: Date }) => ({ left: `${((s.start.getTime() - min) / DAY / span) * 100}%`, width: `${(((s.end.getTime() - s.start.getTime()) / DAY + 1) / span) * 100}%` });
    return { bar, min: new Date(min), max: new Date(max) };
  }, [res]);
  const r = res?.r;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="text-sm">Task
          <select className="mt-1 w-full rounded border px-2 py-1.5" value={taskId} onChange={e => setTaskId(Number(e.target.value))}>
            {open.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></label>
        <label className="text-sm">Scenario
          <select className="mt-1 w-full rounded border px-2 py-1.5" value={type} onChange={e => setType(e.target.value as ChangeType)}>
            {(Object.keys(CHANGE_LABEL) as ChangeType[]).map(k => <option key={k} value={k}>{CHANGE_LABEL[k]}</option>)}
          </select></label>
        {needsDays ? (
          <div className="text-sm">Working days
            <div className="mt-1 flex gap-1">{[1, 3, 5, 7].map(n => <button key={n} onClick={() => setDays(n)} className={`rounded border px-2 py-1 ${days === n ? 'border-teal-600 bg-teal-600 text-white' : 'bg-white'}`}>{n}</button>)}
              <input type="number" min={1} max={30} aria-label="Custom days" className="w-16 rounded border px-2" value={days} onChange={e => setDays(Math.max(1, Number(e.target.value)))} /></div></div>
        ) : <div className="self-end text-sm text-slate-500">No extra input needed.</div>}
        <button disabled={invalid} onClick={run} className="self-end rounded bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-40">Run simulation</button>
        {invalid && <p className="text-xs text-amber-700 md:col-span-4">This task has not started yet, so it cannot be completed today. Pick a task that is in progress or blocked.</p>}
      </div>

      {!r ? <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">Pick a task and a change, then run the simulation to see the projected impact.</p> : (
        <>
          <div className="rounded-lg bg-[#0b2a4a] px-4 py-2 text-sm text-white">Simulated scenario: projected impact only, not a prediction. Real task data is unchanged.</div>
          <div className="grid gap-3 md:grid-cols-4">
            {[['Baseline completion', fmt(r.baselineCompletion)], ['Simulated completion', fmt(r.completion)],
              ['Change', `${r.deltaDays > 0 ? '+' : ''}${r.deltaDays} working days`], ['Deadlines missed', String(r.missed.length)]].map(([k, v]) => (
              <div key={k} className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{k}</div>
                <div className={`mt-1 text-xl font-semibold ${k === 'Change' && r.deltaDays > 0 ? 'text-red-600' : k === 'Change' && r.deltaDays < 0 ? 'text-teal-600' : 'text-[#0b2a4a]'}`}>{v}</div></div>))}
          </div>
          {r.missed.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">{r.missed.map(m => <div key={m.name}>{m.name}: due {m.due}, projected {m.projected}</div>)}</div>}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 md:col-span-2">
              <h3 className="mb-2 font-semibold text-[#0b2a4a]">Baseline vs simulated schedule</h3>
              <div className="space-y-2">
                {tasks.map(t => { const b = r.base.get(t.id)!, s = r.slots.get(t.id)!; const dl = r.affected.find(a => a.id === t.id)?.delta ?? 0; const crit = r.critical.includes(t.id);
                  return (<div key={t.id} className="text-xs"><div className={crit ? 'font-semibold text-[#0b2a4a]' : 'text-slate-600'}>{t.name}{crit && ' (critical path)'}{dl !== 0 && ` · ${dl > 0 ? '+' : ''}${dl}d`}</div>
                    <div className="relative mt-0.5 h-5 rounded bg-slate-100">
                      <div className="absolute top-0 h-2 rounded bg-slate-400" style={range!.bar(b)} title="Baseline" />
                      <div className={`absolute bottom-0 h-2.5 rounded ${dl > 0 ? 'bg-red-500' : dl < 0 ? 'bg-teal-500' : 'bg-[#0b2a4a]'}`} style={range!.bar(s)} title="Simulated" /></div></div>); })}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-500"><span>Grey: baseline</span><span>Navy: unchanged</span><span>Red: later</span><span>Teal: earlier</span><span className="ml-auto">{fmt(range!.min)} to {fmt(range!.max)}</span></div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-4"><h3 className="mb-2 font-semibold text-[#0b2a4a]">Affected tasks ({r.affected.length})</h3>
                {r.affected.length ? r.affected.map(a => <div key={a.id} className="flex justify-between text-sm"><span>{a.name}</span><span className={a.delta > 0 ? 'text-red-600' : 'text-teal-600'}>{a.delta > 0 ? '+' : ''}{a.delta}d</span></div>) : <p className="text-sm text-slate-500">No task dates change. Existing slack absorbs this scenario.</p>}</div>
              <div className="rounded-xl border bg-white p-4"><h3 className="mb-2 font-semibold text-[#0b2a4a]">Assumptions</h3><ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">{ASSUMPTIONS.map(a => <li key={a}>{a}</li>)}</ul></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4">
            <input aria-label="Scenario name" className="min-w-64 flex-1 rounded border px-2 py-1.5 text-sm" value={name} onChange={e => setName(e.target.value)} />
            <button onClick={save} className="rounded bg-[#0b2a4a] px-4 py-2 text-sm font-medium text-white">{saved ? 'Saved' : 'Save scenario'}</button>
            {saved && <span className="text-sm text-teal-700">Saved. Compare it on the Scenario comparison tab.</span>}
          </div>
        </>
      )}
    </div>
  );
}

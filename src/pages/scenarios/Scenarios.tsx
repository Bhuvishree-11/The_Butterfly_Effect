import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Task, Edge, Scenario, evaluate, fmt } from '../part6/engine';

interface Props { tasks: Task[]; edges: Edge[]; scenarios: Scenario[]; onDelete: (id: string) => void; onOpen?: (s: Scenario) => void }
export default function Scenarios({ tasks, edges, scenarios, onDelete, onOpen }: Props) {
  const [picked, setPicked] = useState<string[]>(() => scenarios.slice(0, 3).map(s => s.id));
  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const rows = useMemo(() => {
    const base = evaluate(tasks, edges);
    const out = [{ id: 'base', name: 'Baseline', note: 'Current recorded schedule.', r: base }];
    scenarios.filter(s => picked.includes(s.id)).forEach(s => out.push({ id: s.id, name: s.name, note: s.note, r: evaluate(tasks, edges, s.change) }));
    return out;
  }, [tasks, edges, scenarios, picked]);
  const best = (f: (r: typeof rows[0]['r']) => number) => Math.min(...rows.map(x => f(x.r)));
  const cell = (v: number, b: number) => (v === b && rows.length > 1 ? 'bg-teal-50 font-semibold text-teal-800' : '');
  const chart = rows.map(x => ({ name: x.name.length > 28 ? x.name.slice(0, 26) + '...' : x.name, days: x.r.deltaDays }));

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-[#0b2a4a] px-4 py-2 text-sm text-white">Simulated scenarios: projected impact only. Saved scenarios never change the real workflow.</div>
      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-2 font-semibold text-[#0b2a4a]">Saved scenarios</h3>
        {!scenarios.length ? <p className="text-sm text-slate-500">No scenarios saved yet. Run one in the simulator and save it.</p> : (
          <ul className="divide-y">{scenarios.map(s => (
            <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
              <input type="checkbox" aria-label={`Compare ${s.name}`} checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="flex-1">{s.name}</span>
              {onOpen && <button className="text-teal-700 hover:underline" onClick={() => onOpen(s)}>Open in simulator</button>}
              <button className="text-red-600 hover:underline" onClick={() => { if (confirm(`Delete "${s.name}"?`)) { onDelete(s.id); setPicked(p => p.filter(x => x !== s.id)); } }}>Delete</button>
            </li>))}</ul>)}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>{['Scenario', 'Projected completion', 'Change vs baseline', 'Tasks delayed', 'Downstream affected', 'Deadlines missed', 'Still blocked', 'Intervention and assumptions'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map(x => (
            <tr key={x.id} className="border-t align-top">
              <td className="px-3 py-2 font-medium text-[#0b2a4a]">{x.name}</td>
              <td className={`px-3 py-2 ${cell(x.r.completion.getTime(), Math.min(...rows.map(y => y.r.completion.getTime())))}`}>{fmt(x.r.completion)}</td>
              <td className={`px-3 py-2 ${cell(x.r.deltaDays, best(r => r.deltaDays))}`}>{x.r.deltaDays > 0 ? '+' : ''}{x.r.deltaDays} working days</td>
              <td className={`px-3 py-2 ${cell(x.r.tasksDelayed, best(r => r.tasksDelayed))}`}>{x.r.tasksDelayed}</td>
              <td className="px-3 py-2">{x.r.downstreamAffected}</td>
              <td className={`px-3 py-2 ${cell(x.r.missed.length, best(r => r.missed.length))}`}>{x.r.missed.length}{x.r.missed.length > 0 && <div className="text-xs text-slate-500">{x.r.missed.map(m => m.name).join(', ')}</div>}</td>
              <td className="px-3 py-2">{x.r.stillBlocked.length ? x.r.stillBlocked.join(', ') : 'None'}</td>
              <td className="max-w-xs px-3 py-2 text-xs text-slate-600">{x.note} Working-day calendar, finish-to-start, only the stated change applied.</td>
            </tr>))}</tbody>
        </table>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-2 font-semibold text-[#0b2a4a]">Projected completion vs baseline (working days; below zero is earlier)</h3>
        <div className="h-64"><ResponsiveContainer>
          <BarChart data={chart} layout="vertical" margin={{ left: 40, right: 20 }}>
            <XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12 }} />
            <Tooltip /><ReferenceLine x={0} stroke="#0b2a4a" />
            <Bar dataKey="days" name="Days vs baseline">{chart.map((c, i) => <Cell key={i} fill={c.days > 0 ? '#dc2626' : c.days < 0 ? '#14b8a6' : '#94a3b8'} />)}</Bar>
          </BarChart></ResponsiveContainer></div>
      </div>
    </div>
  );
}

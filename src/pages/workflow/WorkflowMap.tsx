import { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, type Node, type Edge as RFEdge, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Task, Edge, Status, reach, schedule, addWD, parse, fmt, today } from '../part6/engine';

const STYLE: Record<string, string> = {
  not_started: 'border-slate-300 bg-white', in_progress: 'border-teal-500 bg-teal-50',
  completed: 'border-emerald-600 bg-emerald-50', blocked: 'border-amber-500 bg-amber-50', overdue: 'border-red-600 bg-red-50',
};
const LABEL: Record<string, string> = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', blocked: 'Blocked', overdue: 'Overdue' };
const RING = { down: 'ring-4 ring-amber-400', up: 'ring-4 ring-teal-400', sel: 'ring-4 ring-[#0b2a4a]' };

interface NData { task: Task; kind: string; start: string; end: string; down: number; dim: boolean; ring: string; [k: string]: unknown }
function TaskNode({ data }: NodeProps) {
  const n = data as NData;
  return (
    <div className={`w-56 rounded-lg border-2 p-3 text-xs shadow-sm transition ${STYLE[n.kind]} ${n.ring} ${n.dim ? 'opacity-25' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="text-sm font-semibold text-slate-900">{n.task.name}</div>
      <div className="mt-1 inline-block rounded bg-white/80 px-1.5 py-0.5 font-medium">{LABEL[n.kind]}</div>
      <div className="mt-1 text-slate-600">{n.task.assignee}</div>
      <div className="text-slate-600">{n.start} to {n.end}</div>
      {n.task.actualEnd && <div className="text-emerald-700">Done {n.task.actualEnd}</div>}
      <div className="mt-1 font-medium text-slate-700">{n.down} downstream</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { task: TaskNode };

interface Props { tasks: Task[]; edges: Edge[]; onStatusChange?: (id: number, s: Status) => void; onSimulate?: (id: number) => void; canEdit?: boolean }
export default function WorkflowMap({ tasks, edges, onStatusChange, onSimulate, canEdit = true }: Props) {
  const [sel, setSel] = useState<number | null>(null);
  const [fStatus, setFStatus] = useState('all');
  const [fWho, setFWho] = useState('all');
  const T = today();
  const slots = useMemo(() => schedule(tasks, edges), [tasks, edges]);
  const kindOf = (t: Task) => (t.status !== 'completed' && addWD(parse(t.start), t.duration - 1) < T ? (t.status === 'blocked' ? 'blocked' : 'overdue') : t.status);
  const level = useMemo(() => {
    const L = new Map<number, number>(); const get = (id: number): number => {
      if (L.has(id)) return L.get(id)!;
      const ps = edges.filter(e => e.target === id).map(e => get(e.source)); const v = ps.length ? Math.max(...ps) + 1 : 0; L.set(id, v); return v;
    }; tasks.forEach(t => get(t.id)); return L;
  }, [tasks, edges]);
  const down = useMemo(() => (sel ? reach(sel, edges, 'down') : new Set<number>()), [sel, edges]);
  const up = useMemo(() => (sel ? reach(sel, edges, 'up') : new Set<number>()), [sel, edges]);

  const nodes: Node[] = useMemo(() => {
    const row = new Map<number, number>();
    return tasks.map(t => {
      const lv = level.get(t.id)!, r = row.get(lv) || 0; row.set(lv, r + 1);
      const match = (fStatus === 'all' || kindOf(t) === fStatus || t.status === fStatus) && (fWho === 'all' || t.assignee === fWho);
      const inPath = sel === null || t.id === sel || down.has(t.id) || up.has(t.id);
      const ring = t.id === sel ? RING.sel : down.has(t.id) ? RING.down : up.has(t.id) ? RING.up : '';
      const s = slots.get(t.id)!;
      return { id: String(t.id), type: 'task', position: { x: lv * 290, y: r * 190 },
        data: { task: t, kind: kindOf(t), start: fmt(s.start), end: fmt(s.end), down: reach(t.id, edges, 'down').size, dim: !match || !inPath, ring } as NData };
    });
  }, [tasks, edges, level, sel, down, up, fStatus, fWho, slots]);

  const rfEdges: RFEdge[] = edges.map(e => {
    const isDown = sel !== null && (e.source === sel || down.has(e.source)) && down.has(e.target);
    const isUp = sel !== null && (e.target === sel || up.has(e.target)) && up.has(e.source);
    return { id: `${e.source}-${e.target}`, source: String(e.source), target: String(e.target), animated: isDown,
      style: { stroke: isDown ? '#f59e0b' : isUp ? '#14b8a6' : '#94a3b8', strokeWidth: isDown || isUp ? 3 : 1.5, opacity: sel && !isDown && !isUp ? 0.2 : 1 } };
  });

  const t = tasks.find(x => x.id === sel);
  const names = (s: Set<number>) => tasks.filter(x => s.has(x.id)).map(x => x.name);
  const people = Array.from(new Set(tasks.map(x => x.assignee)));
  return (
    <div className="flex h-[640px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="relative flex-1">
        <div className="absolute left-3 top-3 z-10 flex gap-2 rounded-lg bg-white p-2 text-xs shadow">
          <select aria-label="Filter by status" className="rounded border px-1 py-1" value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="all">All statuses</option>{Object.keys(LABEL).map(k => <option key={k} value={k}>{LABEL[k]}</option>)}
          </select>
          <select aria-label="Filter by team" className="rounded border px-1 py-1" value={fWho} onChange={e => setFWho(e.target.value)}>
            <option value="all">All teams</option>{people.map(p => <option key={p}>{p}</option>)}
          </select>
          {sel && <button className="rounded bg-slate-100 px-2" onClick={() => setSel(null)}>Clear selection</button>}
        </div>
        <ReactFlow nodes={nodes} edges={rfEdges} nodeTypes={nodeTypes} fitView nodesDraggable={false}
          onNodeClick={(_, n) => setSel(Number(n.id))} onPaneClick={() => setSel(null)}>
          <Background /><Controls /><MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <aside className="w-72 overflow-y-auto border-l border-slate-200 bg-white p-4 text-sm">
        {!t ? <p className="text-slate-500">Select a task to see its details and the tasks a delay would reach.</p> : (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[#0b2a4a]">{t.name}</h3>
            <div>{LABEL[kindOf(t)]} · {t.assignee}</div>
            <div className="text-slate-600">Projected {fmt(slots.get(t.id)!.start)} to {fmt(slots.get(t.id)!.end)}</div>
            {t.status === 'blocked' && t.blockedUntil && <div className="rounded bg-amber-50 p-2 text-amber-800">Blocked until {t.blockedUntil}. {down.size} downstream tasks wait on this.</div>}
            <div><div className="font-medium">Upstream ({up.size})</div><ul className="list-disc pl-5 text-slate-600">{names(up).map(n => <li key={n}>{n}</li>)}{!up.size && <li className="-ml-5 list-none">None</li>}</ul></div>
            <div><div className="font-medium">Downstream ({down.size})</div><ul className="list-disc pl-5 text-slate-600">{names(down).map(n => <li key={n}>{n}</li>)}{!down.size && <li className="-ml-5 list-none">None</li>}</ul></div>
            {canEdit && onStatusChange && (
              <label className="block">Update status
                <select className="mt-1 w-full rounded border px-2 py-1" value={t.status} onChange={e => onStatusChange(t.id, e.target.value as Status)}>
                  {(['not_started', 'in_progress', 'blocked', 'completed'] as Status[]).map(s => <option key={s} value={s}>{LABEL[s]}</option>)}
                </select>
              </label>
            )}
            {onSimulate && t.status !== 'completed' && <button className="w-full rounded bg-teal-600 px-3 py-2 font-medium text-white hover:bg-teal-700" onClick={() => onSimulate(t.id)}>Simulate a change to this task</button>}
          </div>
        )}
        <div className="mt-6 border-t pt-3 text-xs text-slate-500">Amber ring: downstream of selection. Teal ring: upstream prerequisites.</div>
      </aside>
    </div>
  );
}

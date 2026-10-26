import { useEffect, useState } from 'react';
import WorkflowMap from '../workflow/WorkflowMap';
import Simulator from '../simulator/Simulator';
import Scenarios from '../scenarios/Scenarios';
import { Task, Scenario, Status } from './engine';
import { TASKS, EDGES, SEED_SCENARIOS } from './mock';

const KEY = 'butterfly.scenarios.v1';
const load = (): Scenario[] => { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : SEED_SCENARIOS; } catch { return SEED_SCENARIOS; } };

export default function Part6App() {
  const [tab, setTab] = useState<'map' | 'sim' | 'cmp'>('map');
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [scenarios, setScenarios] = useState<Scenario[]>(load);
  const [simTask, setSimTask] = useState<number | null>(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(scenarios)); } catch { /* storage unavailable */ } }, [scenarios]);
  const tabs = [['map', 'Workflow map'], ['sim', 'Butterfly simulator'], ['cmp', 'Scenario comparison']] as const;
  return (
    <div className="mx-auto max-w-7xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#0b2a4a]">The Butterfly Effect</h1>
        <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Synthetic demonstration data</span>
      </header>
      <nav className="mb-4 flex gap-2" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === k ? 'bg-[#0b2a4a] text-white' : 'border bg-white text-slate-700'}`}>{l}</button>)}
      </nav>
      {tab === 'map' && <WorkflowMap tasks={tasks} edges={EDGES}
        onStatusChange={(id, s: Status) => { if (confirm('Change this task status? This only affects the local demo data.')) setTasks(ts => ts.map(t => (t.id === id ? { ...t, status: s } : t))); }}
        onSimulate={id => { setSimTask(id); setTab('sim'); }} />}
      {tab === 'sim' && <Simulator key={simTask ?? 'x'} tasks={tasks} edges={EDGES} initialTaskId={simTask} onSave={s => setScenarios(p => [...p, s])} />}
      {tab === 'cmp' && <Scenarios tasks={tasks} edges={EDGES} scenarios={scenarios} onDelete={id => setScenarios(p => p.filter(s => s.id !== id))}
        onOpen={() => setTab('sim')} />}
    </div>
  );
}

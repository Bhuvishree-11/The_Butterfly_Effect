import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

import WorkflowMap from '../workflow/WorkflowMap';
import Simulator from '../simulator/Simulator';
import Scenarios from '../scenarios/Scenarios';

import { Task, Scenario, Status } from './engine';
import { TASKS, EDGES, SEED_SCENARIOS } from './mock';

const KEY = 'butterfly.scenarios.v1';

const load = (): Scenario[] => {
  try {
    const value = localStorage.getItem(KEY);
    return value ? JSON.parse(value) : SEED_SCENARIOS;
  } catch {
    return SEED_SCENARIOS;
  }
};

const COLORS: Record<string, string> = {
  Completed: '#059669',
  'In progress': '#0284c7',
  Blocked: '#dc2626',
  'Not started': '#94a3b8',
};

export default function Part6App() {
  const [tab, setTab] = useState<'dashboard' | 'map' | 'sim' | 'cmp'>(
    'dashboard',
  );

  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [scenarios, setScenarios] = useState<Scenario[]>(load);
  const [simTask, setSimTask] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(scenarios));
    } catch {
      // Local storage may be unavailable.
    }
  }, [scenarios]);

  const completed = tasks.filter(
    (task) => task.status === 'completed',
  ).length;

  const inProgress = tasks.filter(
    (task) => task.status === 'in_progress',
  ).length;

  const blocked = tasks.filter(
    (task) => task.status === 'blocked',
  ).length;

  const notStarted = tasks.filter(
    (task) => task.status === 'not_started',
  ).length;

  const chartData = [
    { name: 'Completed', value: completed },
    { name: 'In progress', value: inProgress },
    { name: 'Blocked', value: blocked },
    { name: 'Not started', value: notStarted },
  ];

  const tabs = [
    ['dashboard', 'Dashboard'],
    ['map', 'Workflow map'],
    ['sim', 'Butterfly simulator'],
    ['cmp', 'Scenario comparison'],
  ] as const;

  const cards = [
    {
      label: 'Total tasks',
      value: tasks.length,
      description: 'Across the current workflow',
      color: 'text-slate-900',
    },
    {
      label: 'Completed',
      value: completed,
      description: 'Successfully finished',
      color: 'text-emerald-700',
    },
    {
      label: 'In progress',
      value: inProgress,
      description: 'Currently being processed',
      color: 'text-sky-700',
    },
    {
      label: 'Blocked',
      value: blocked,
      description: 'Require attention',
      color: 'text-red-700',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
              Workflow intelligence
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#0b2a4a] md:text-3xl">
              The Butterfly Effect
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Workflow monitoring, dependency analysis and delay simulation
            </p>
          </div>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Synthetic demonstration data
          </span>
        </header>

        <nav
          className="mb-8 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
          aria-label="Main navigation"
        >
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === key
                  ? 'bg-[#0b2a4a] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && (
          <main>
            <section className="mb-7 rounded-2xl bg-[#0b2a4a] p-6 text-white md:p-8">
              <p className="mb-2 text-sm font-medium text-teal-200">
                WORKFLOW OVERVIEW
              </p>

              <h2 className="max-w-2xl text-2xl font-bold md:text-3xl">
                See the impact before a delay becomes a bigger problem.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor task progress, identify blocked dependencies and
                compare possible interventions using the workflow tools.
              </p>

              <button
                onClick={() => setTab('map')}
                className="mt-5 rounded-lg bg-teal-500 px-5 py-3 text-sm font-bold text-white hover:bg-teal-400"
              >
                Explore workflow →
              </button>
            </section>

            <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>

                  <p className={`mt-3 text-3xl font-bold ${card.color}`}>
                    {card.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {card.description}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-2">
                  <h3 className="text-lg font-bold text-[#0b2a4a]">
                    Task status distribution
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Current status of all {tasks.length} workflow tasks
                  </p>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={85}
                        innerRadius={48}
                        paddingAngle={3}
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[entry.name]}
                          />
                        ))}
                      </Pie>

                      <Tooltip />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#0b2a4a]">
                      Tasks requiring attention
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Blocked and unfinished tasks
                    </p>
                  </div>

                  <button
                    onClick={() => setTab('map')}
                    className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                  >
                    View map →
                  </button>
                </div>

                <div className="space-y-3">
                  {tasks
                    .filter(
                      (task) =>
                        task.status === 'blocked' ||
                        task.status === 'in_progress',
                    )
                    .map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {task.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Assigned to {task.assignee}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            task.status === 'blocked'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-sky-50 text-sky-700'
                          }`}
                        >
                          {task.status === 'blocked'
                            ? 'Blocked'
                            : 'In progress'}
                        </span>
                      </div>
                    ))}

                  {blocked === 0 && inProgress === 0 && (
                    <p className="text-sm text-slate-500">
                      No blocked or in-progress tasks.
                    </p>
                  )}
                </div>

                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Not started</span>
                    <span className="font-bold">{notStarted}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-500"
                      style={{
                        width: `${tasks.length ? (notStarted / tasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            </section>

            <p className="mt-6 text-center text-xs text-slate-400">
              Dashboard metrics are calculated from local synthetic workflow
              data. They do not represent live institutional records.
            </p>
          </main>
        )}

        {tab === 'map' && (
          <WorkflowMap
            tasks={tasks}
            edges={EDGES}
            onStatusChange={(id, status: Status) => {
              if (
                confirm(
                  'Change this task status? This only affects the local demo data.',
                )
              ) {
                setTasks((current) =>
                  current.map((task) =>
                    task.id === id ? { ...task, status } : task,
                  ),
                );
              }
            }}
            onSimulate={(id) => {
              setSimTask(id);
              setTab('sim');
            }}
          />
        )}

        {tab === 'sim' && (
          <Simulator
            key={simTask ?? 'x'}
            tasks={tasks}
            edges={EDGES}
            initialTaskId={simTask}
            onSave={(scenario) =>
              setScenarios((current) => [...current, scenario])
            }
          />
        )}

        {tab === 'cmp' && (
          <Scenarios
            tasks={tasks}
            edges={EDGES}
            scenarios={scenarios}
            onDelete={(id) =>
              setScenarios((current) =>
                current.filter((scenario) => scenario.id !== id),
              )
            }
            onOpen={() => setTab('sim')}
          />
        )}
      </div>
    </div>
  );
}
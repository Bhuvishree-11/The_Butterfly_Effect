
import { useEffect, useState } from 'react';
import WorkflowMap from '../workflow/WorkflowMap';
import Simulator from '../simulator/Simulator';
import Scenarios from '../scenarios/Scenarios';
import { Task, Scenario, Status } from './engine';
import { TASKS, EDGES, SEED_SCENARIOS } from './mock';
import { api } from '../../services/api';

const KEY = 'butterfly.scenarios.v1';

type BackendTask = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  due_date?: string | null;
  created_at?: string;
};

type DashboardData = {
  total_applications?: number;
  total_tasks?: number;
  applications_by_status?: Record<string, number>;
  tasks_by_status?: Record<string, number>;
};

function toWorkflowStatus(status: string): Status {
  switch (status.toLowerCase()) {
    case 'in progress':
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'blocked':
      return 'blocked';
    default:
      return 'not_started';
  }
}

function toBackendStatus(status: Status): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'blocked':
      return 'Blocked';
    default:
      return 'Pending';
  }
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

const load = (): Scenario[] => {
  try {
    const value = localStorage.getItem(KEY);
    return value ? JSON.parse(value) : SEED_SCENARIOS;
  } catch {
    return SEED_SCENARIOS;
  }
};

export default function Part6App() {
  const [tab, setTab] = useState<'map' | 'sim' | 'cmp'>('map');
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [scenarios, setScenarios] = useState<Scenario[]>(load);
  const [simTask, setSimTask] = useState<number | null>(null);

  const [dashboardData, setDashboardData] =
    useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [tasksError, setTasksError] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Maps a workflow task ID to its real backend database ID.
  const [backendIdByWorkflowId, setBackendIdByWorkflowId] =
    useState<Record<number, number>>({});

  async function refreshDashboard() {
    try {
      const data = await api.getDashboard();
      setDashboardData(data as DashboardData);
      setDashboardError('');
    } catch (error) {
      console.error('Dashboard API error:', error);
      setDashboardError('Unable to load dashboard data.');
    }
  }

  async function refreshTasks() {
    setLoadingTasks(true);

    try {
      const data = (await api.getTasks()) as BackendTask[];
      const currentTasks = tasks;
      const matchedWorkflowIds = new Set<number>();
      const idMapping: Record<number, number> = {};
      const mergedTasks: Task[] = [...currentTasks];

      // Start new workflow IDs above all existing IDs to avoid collisions.
      let nextWorkflowId =
        Math.max(0, ...currentTasks.map((task) => task.id)) + 1;

      for (const backendTask of data) {
        // Match by title, NOT by ID. Backend IDs and workflow IDs
        // belong to different ID spaces.
        const existingIndex = mergedTasks.findIndex(
          (task) =>
            !matchedWorkflowIds.has(task.id) &&
            normalizeTitle(task.name) ===
              normalizeTitle(backendTask.title)
        );

        if (existingIndex !== -1) {
          const existingTask = mergedTasks[existingIndex];

          matchedWorkflowIds.add(existingTask.id);
          idMapping[existingTask.id] = backendTask.id;

          mergedTasks[existingIndex] = {
            ...existingTask,
            name: backendTask.title,
            status: toWorkflowStatus(backendTask.status),
            ...(backendTask.due_date
              ? {
                  deadline: backendTask.due_date.slice(0, 10),
                  deadlineLabel: 'Backend task deadline',
                }
              : {}),
          };
        } else {
          // Give unmatched backend tasks a unique workflow ID.
          // Keep the actual database ID in idMapping for API updates.
          const workflowId = nextWorkflowId++;

          matchedWorkflowIds.add(workflowId);
          idMapping[workflowId] = backendTask.id;

          mergedTasks.push({
            id: workflowId,
            name: backendTask.title,
            status: toWorkflowStatus(backendTask.status),
            assignee: 'Unassigned',
            start: new Date().toISOString().slice(0, 10),
            duration: 1,
            ...(backendTask.due_date
              ? {
                  deadline: backendTask.due_date.slice(0, 10),
                  deadlineLabel: 'Backend task deadline',
                }
              : {}),
          });
        }
      }

      setTasks(mergedTasks);
      setBackendIdByWorkflowId(idMapping);
      setTasksError('');
    } catch (error) {
      console.error('Tasks API error:', error);
      setTasksError(
        'Unable to load backend tasks. Showing the existing workflow data.'
      );
    } finally {
      setLoadingTasks(false);
    }
  }

  useEffect(() => {
    void refreshDashboard();
    void refreshTasks();
    // Load backend data when this page first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(scenarios));
    } catch {
      // Local storage may be unavailable.
    }
  }, [scenarios]);

  const tabs = [
    ['map', 'Workflow map'],
    ['sim', 'Butterfly simulator'],
    ['cmp', 'Scenario comparison'],
  ] as const;

  async function handleStatusChange(id: number, status: Status) {
    const existingTask = tasks.find((task) => task.id === id);
    if (!existingTask) return;

    if (!confirm('Save this task status change?')) return;

    const backendId = backendIdByWorkflowId[id];

    // Demo-only tasks can still be changed locally.
    if (backendId === undefined) {
      setTasks((current) =>
        current.map((task) =>
          task.id === id ? { ...task, status } : task
        )
      );

      alert(
        'This is a demo workflow task. Its status changed locally only; it is not stored in the backend.'
      );
      return;
    }

    // Optimistically update the displayed status.
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, status } : task
      )
    );

    try {
      // Send the real backend ID, not the workflow ID.
      await api.updateTaskStatus(backendId, toBackendStatus(status));
      await refreshDashboard();
    } catch (error) {
      console.error('Task status update error:', error);

      // Restore the previous status if the backend update fails.
      setTasks((current) =>
        current.map((task) =>
          task.id === id
            ? { ...task, status: existingTask.status }
            : task
        )
      );

      alert(
        'The backend could not save this status change. The previous status has been restored.'
      );
    }
  }

  const workflowEdges = EDGES.filter(
    (edge) =>
      tasks.some((task) => task.id === edge.source) &&
      tasks.some((task) => task.id === edge.target)
  );

  return (
    <div className="mx-auto max-w-7xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#0b2a4a]">
          The Butterfly Effect
        </h1>
        <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
          AICTE approval workflow
        </span>
      </header>

      <section className="mb-5 rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-[#0b2a4a]">
            Live Backend Dashboard
          </h2>

          <button
            className="rounded border px-3 py-1 text-sm"
            onClick={() => {
              void refreshDashboard();
              void refreshTasks();
            }}
          >
            Refresh
          </button>
        </div>

        {dashboardError ? (
          <p className="text-sm text-red-600">{dashboardError}</p>
        ) : dashboardData ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-500">Total applications</p>
              <p className="text-2xl font-semibold">
                {dashboardData.total_applications ?? 'N/A'}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-500">Total tasks</p>
              <p className="text-2xl font-semibold">
                {dashboardData.total_tasks ?? 'N/A'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Loading dashboard data...
          </p>
        )}

        {tasksError && (
          <p className="mt-2 text-sm text-red-600">{tasksError}</p>
        )}

        {loadingTasks && (
          <p className="mt-2 text-sm text-slate-500">
            Loading workflow tasks...
          </p>
        )}
      </section>

      <nav className="mb-4 flex flex-wrap gap-2" role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === key
                ? 'bg-[#0b2a4a] text-white'
                : 'border bg-white text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'map' && (
        <WorkflowMap
          tasks={tasks}
          edges={workflowEdges}
          onStatusChange={handleStatusChange}
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
          edges={workflowEdges}
          initialTaskId={simTask}
          onSave={(scenario) =>
            setScenarios((previous) => [...previous, scenario])
          }
        />
      )}

      {tab === 'cmp' && (
        <Scenarios
          tasks={tasks}
          edges={workflowEdges}
          scenarios={scenarios}
          onDelete={(id) =>
            setScenarios((previous) =>
              previous.filter((scenario) => scenario.id !== id)
            )
          }
          onOpen={() => setTab('sim')}
        />
      )}
    </div>
  );
}

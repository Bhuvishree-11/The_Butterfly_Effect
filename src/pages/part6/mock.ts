import { Task, Edge, Scenario, addWD, fmt, today } from './engine';
// SYNTHETIC DEMONSTRATION DATA. Dates are relative to today so the demo always looks current.
const d = (n: number) => fmt(addWD(today(), n));
export const TASKS: Task[] = [
  { id: 1, name: 'Document Submission', status: 'completed', assignee: 'Institution Desk', start: d(-12), duration: 3, actualEnd: d(-9) },
  { id: 2, name: 'Initial Scrutiny', status: 'in_progress', assignee: 'Dr. Rao', start: d(-3), duration: 5 },
  { id: 3, name: 'Document Verification', status: 'blocked', assignee: 'Verification Cell', start: d(2), duration: 4, blockedUntil: d(8) },
  { id: 4, name: 'Evaluation Scheduling', status: 'not_started', assignee: 'Scheduling Team', start: d(6), duration: 2 },
  { id: 5, name: 'Evaluation', status: 'not_started', assignee: 'Expert Committee', start: d(8), duration: 5 },
  { id: 6, name: 'Final Review', status: 'not_started', assignee: 'Dr. Mehta', start: d(13), duration: 3 },
  { id: 7, name: 'Approval Decision', status: 'not_started', assignee: 'Approval Board', start: d(16), duration: 2, deadline: d(20), deadlineLabel: 'Approval target date' },
  { id: 8, name: 'Compliance Filing', status: 'not_started', assignee: 'Compliance Officer', start: d(2), duration: 3, deadline: d(10), deadlineLabel: 'Compliance filing deadline' },
];
export const EDGES: Edge[] = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [2, 8], [8, 6]].map(([source, target]) => ({ source, target }));
export const SEED_SCENARIOS: Scenario[] = [
  { id: 'seed-a', name: 'A: Clear the verification hold today', change: { type: 'prioritise', taskId: 3, days: 0 }, note: 'Intervention: institution documents received, verification starts as soon as scrutiny ends.' },
  { id: 'seed-b', name: 'B: Shorten Evaluation by 2 days', change: { type: 'reduce_duration', taskId: 5, days: 2 }, note: 'Intervention: committee agrees to a 3-day evaluation window.' },
  { id: 'seed-c', name: 'C: Shorten Verification by 2 days', change: { type: 'reduce_duration', taskId: 3, days: 2 }, note: 'Intervention: parallel checks once the hold lifts.' },
];

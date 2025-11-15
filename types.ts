
export type AgentStatus = 'idle' | 'planning' | 'fetching' | 'analyzing' | 'monitoring' | 'reporting' | 'complete' | 'error';
export type TaskStatus = 'pending' | 'active' | 'complete';

export interface Report {
  location: string;
  cropHealth: string;
  rainfallForecast: string;
  pestRisk: string;
  recommendations: string[];
}

export interface MemoryEntry {
  id: number;
  summary: string;
}

export interface AppState {
  status: AgentStatus;
  userInput: string;
  plan: string[];
  fetchedData: Record<string, TaskStatus>;
  analysisSteps: Record<string, TaskStatus>;
  riskStatus: string;
  isMonitoringPaused: boolean;
  report: Report | null;
  memory: MemoryEntry[];
  error: string | null;
}

export type AppAction =
  | { type: 'START_ANALYSIS'; payload: string }
  | { type: 'PLAN_GENERATED'; payload: string[] }
  | { type: 'FETCH_DATA_UPDATE'; payload: { item: string; status: TaskStatus } }
  | { type: 'FETCH_DATA_COMPLETE' }
  | { type: 'ANALYZE_STEP_UPDATE'; payload: { item: string; status: TaskStatus } }
  | { type: 'ANALYZE_DATA_COMPLETE' }
  | { type: 'UPDATE_RISK_STATUS'; payload: string }
  | { type: 'TOGGLE_MONITORING' }
  | { type: 'GENERATE_REPORT'; payload: Report }
  | { type: 'COMPLETE_AND_SAVE'; payload: string }
  | { type: 'RESET' }
  | { type: 'SET_ERROR'; payload: string };

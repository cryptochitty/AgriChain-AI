
import React, { useState, useEffect, useReducer, useCallback, Reducer } from 'react';
import { generatePlan } from './services/geminiService';
import { AgentCard } from './components/AgentCard';
import { PlannerIcon } from './components/icons/PlannerIcon';
import { DataFetcherIcon } from './components/icons/DataFetcherIcon';
import { AnalyzerIcon } from './components/icons/AnalyzerIcon';
import { RiskDetectorIcon } from './components/icons/RiskDetectorIcon';
import { ReportGeneratorIcon } from './components/icons/ReportGeneratorIcon';
import { MemoryIcon } from './components/icons/MemoryIcon';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';
import { ClockIcon } from './components/icons/ClockIcon';
import { InProgressIcon } from './components/icons/InProgressIcon';
// FIX: Import `TaskStatus` to resolve type errors when mapping over state objects.
import type { AppState, AppAction, Report, MemoryEntry, TaskStatus } from './types';

const initialState: AppState = {
  status: 'idle',
  userInput: 'Analyze my farm conditions in Tamil Nadu, India.',
  plan: [],
  fetchedData: {},
  analysisSteps: {},
  riskStatus: 'Not Started',
  isMonitoringPaused: false,
  report: null,
  memory: [
    { id: 1, summary: "Initial analysis for Western Cape, SA. Yield forecast: 4.2 t/ha." },
    { id: 2, summary: "Pest risk assessment for Iowa, USA. Low risk detected." },
  ],
  error: null,
};

const appReducer: Reducer<AppState, AppAction> = (state, action) => {
  switch (action.type) {
    case 'START_ANALYSIS':
      return {
        ...initialState,
        memory: state.memory,
        userInput: action.payload,
        status: 'planning',
      };
    case 'PLAN_GENERATED':
      const initialFetchedData = action.payload.filter(p => p.toLowerCase().includes('fetch')).reduce((acc, item) => ({ ...acc, [item]: 'pending' }), {});
      return {
        ...state,
        status: 'fetching',
        plan: action.payload,
        fetchedData: initialFetchedData
      };
    case 'FETCH_DATA_UPDATE':
      return {
        ...state,
        fetchedData: { ...state.fetchedData, [action.payload.item]: action.payload.status },
      };
    case 'FETCH_DATA_COMPLETE':
       const initialAnalysisSteps = state.plan.filter(p => p.toLowerCase().includes('analyze') || p.toLowerCase().includes('detect')).reduce((acc, item) => ({ ...acc, [item]: 'pending' }), {});
      return { ...state, status: 'analyzing', analysisSteps: initialAnalysisSteps };
    case 'ANALYZE_STEP_UPDATE':
      return {
        ...state,
        analysisSteps: { ...state.analysisSteps, [action.payload.item]: action.payload.status },
      };
    case 'ANALYZE_DATA_COMPLETE':
      return { ...state, status: 'monitoring' };
    case 'UPDATE_RISK_STATUS':
      return { ...state, riskStatus: action.payload };
    case 'TOGGLE_MONITORING':
      return { ...state, isMonitoringPaused: !state.isMonitoringPaused };
    case 'GENERATE_REPORT':
      return { ...state, status: 'reporting', report: action.payload };
    case 'COMPLETE_AND_SAVE':
      return { 
        ...state, 
        status: 'complete',
        memory: [...state.memory, {id: Date.now(), summary: action.payload}]
      };
    case 'RESET':
      return {
        ...initialState,
        memory: state.memory,
      };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isProcessing, setIsProcessing] = useState(false);

  const runSimulation = useCallback(async () => {
    setIsProcessing(true);
    // 1. Planner Agent
    try {
      const planTasks = await generatePlan(state.userInput);
      dispatch({ type: 'PLAN_GENERATED', payload: planTasks });

      // 2. DataFetcher Agent
      const dataFetchingTasks = planTasks.filter(p => p.toLowerCase().includes('fetch'));
      const dataFetchingPromises = dataFetchingTasks.map((task, i) =>
        new Promise<void>(resolve =>
          setTimeout(() => {
            dispatch({ type: 'FETCH_DATA_UPDATE', payload: { item: task, status: 'complete' } });
            resolve();
          }, (i + 1) * 700)
        )
      );
      await Promise.all(dataFetchingPromises);
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'FETCH_DATA_COMPLETE' });

      // 3. Analyzer Agent
      const analysisTasks = planTasks.filter(p => p.toLowerCase().includes('analyze') || p.toLowerCase().includes('detect'));
      for (const task of analysisTasks) {
        await new Promise(resolve => setTimeout(resolve, 800));
        dispatch({ type: 'ANALYZE_STEP_UPDATE', payload: { item: task, status: 'complete' } });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'ANALYZE_DATA_COMPLETE' });

    } catch (error) {
      console.error(error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to communicate with AI. Please check your API key and try again.' });
      setIsProcessing(false);
    }
  }, [state.userInput]);

  useEffect(() => {
    if (state.status === 'planning') {
      runSimulation();
    }
  }, [state.status, runSimulation]);

  useEffect(() => {
    let riskInterval: number;
    if (state.status === 'monitoring' && !state.isMonitoringPaused) {
      const risks = ['Weather: Stable', 'Pest Alerts: Low', 'Soil Moisture: Optimal', 'Crop Health: Good', 'Weather: Light showers expected'];
      let riskIndex = 0;
      dispatch({ type: 'UPDATE_RISK_STATUS', payload: 'Monitoring Active...' });
      riskInterval = window.setInterval(() => {
        dispatch({ type: 'UPDATE_RISK_STATUS', payload: risks[riskIndex] });
        riskIndex = (riskIndex + 1) % risks.length;
      }, 2000);
    }
    return () => clearInterval(riskInterval);
  }, [state.status, state.isMonitoringPaused]);

  const handleGenerateReport = () => {
    const reportData: Report = {
      location: state.userInput.split(' in ')[1] || 'Unknown Location',
      cropHealth: 'Excellent (95%)',
      rainfallForecast: '3mm expected in the next 48 hours.',
      pestRisk: 'Low. No immediate threats detected.',
      recommendations: [
        'Maintain current irrigation schedule.',
        'Monitor for aphids near plot B.',
        'Consider nitrogen supplement in 2 weeks.',
      ],
    };
    dispatch({ type: 'GENERATE_REPORT', payload: reportData });
    const reportSummary = `Analysis for ${reportData.location}: Crop health at ${reportData.cropHealth}, Pest risk is ${reportData.pestRisk}`;
    setTimeout(() => {
        dispatch({ type: 'COMPLETE_AND_SAVE', payload: reportSummary });
        setIsProcessing(false);
    }, 1500);
  };

  // FIX: Use the imported TaskStatus type for the function parameter for better type safety and consistency.
  const getStatusComponent = (status: TaskStatus) => {
    if (status === 'complete') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
    if (status === 'active') return <InProgressIcon className="w-5 h-5 text-blue-400 animate-spin"/>;
    return <ClockIcon className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-green-400">AgriChain AI</h1>
          <p className="text-gray-400 mt-2 text-lg">Multi-Agent Agricultural Analysis System</p>
        </header>

        <div className="bg-gray-800/50 backdrop-blur-sm shadow-2xl rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <input
              type="text"
              value={state.userInput}
              onChange={(e) => dispatch({ type: 'START_ANALYSIS', payload: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Analyze my farm in Tamil Nadu"
              disabled={isProcessing}
            />
            <button
              onClick={() => dispatch({ type: 'START_ANALYSIS', payload: state.userInput })}
              disabled={isProcessing}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-3 px-6 rounded-md transition-colors duration-300 whitespace-nowrap"
            >
              {isProcessing ? 'Processing...' : 'Start Analysis'}
            </button>
             <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-md transition-colors duration-300"
              hidden={!isProcessing && state.status === 'idle'}
            >
              Reset
            </button>
          </div>
           {state.status === 'error' && <p className="text-red-400 mt-4 text-center">{state.error}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="space-y-6">
            <AgentCard title="Planner Agent" icon={<PlannerIcon />} status={state.status} activeStates={['planning']}>
              {state.plan.length > 0 ? (
                <ul className="space-y-2">
                  {state.plan.map((task, i) => <li key={i} className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-green-400"/> {task}</li>)}
                </ul>
              ) : <p className="text-gray-400">Awaiting user request...</p>}
            </AgentCard>

            <AgentCard title="DataFetcher Agent" icon={<DataFetcherIcon />} status={state.status} activeStates={['fetching']}>
              {Object.keys(state.fetchedData).length > 0 ? (
                <ul className="space-y-2">
                  {Object.entries(state.fetchedData).map(([task, taskStatus]) => (
                    <li key={task} className="flex items-center gap-3">
                      {/* FIX: Cast taskStatus to TaskStatus as Object.entries may not preserve the specific value type from the Record. */}
                      {getStatusComponent(taskStatus as TaskStatus)}
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-400">Waiting for plan...</p>}
            </AgentCard>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            <AgentCard title="Analyzer Agent" icon={<AnalyzerIcon />} status={state.status} activeStates={['analyzing']}>
              {Object.keys(state.analysisSteps).length > 0 ? (
                <ul className="space-y-2">
                  {Object.entries(state.analysisSteps).map(([task, taskStatus]) => (
                    <li key={task} className="flex items-center gap-3">
                      {/* FIX: Cast taskStatus to TaskStatus as Object.entries may not preserve the specific value type from the Record. */}
                      {getStatusComponent(taskStatus as TaskStatus)}
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-400">Waiting for data...</p>}
            </AgentCard>

            <AgentCard title="Risk Detection Agent" icon={<RiskDetectorIcon />} status={state.status} activeStates={['monitoring']}>
              <div className="text-center">
                <p className="text-2xl font-semibold text-yellow-400 mb-4">{state.riskStatus}</p>
                {state.status === 'monitoring' && (
                  <div className="flex gap-4 justify-center">
                    <button onClick={() => dispatch({ type: 'TOGGLE_MONITORING' })} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-semibold">
                      {state.isMonitoringPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button onClick={handleGenerateReport} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md font-semibold">
                      Generate Report
                    </button>
                  </div>
                )}
              </div>
            </AgentCard>
          </div>

          {/* Column 3 */}
          <div className="space-y-6 lg:col-span-1">
             <AgentCard title="Report Generator" icon={<ReportGeneratorIcon />} status={state.status} activeStates={['reporting', 'complete']}>
               {state.report ? (
                 <div className="space-y-3">
                   <h4 className="font-bold text-green-400">Location: {state.report.location}</h4>
                   <p><span className="font-semibold text-gray-300">Crop Health:</span> {state.report.cropHealth}</p>
                   <p><span className="font-semibold text-gray-300">Pest Risk:</span> {state.report.pestRisk}</p>
                   <p><span className="font-semibold text-gray-300">Forecast:</span> {state.report.rainfallForecast}</p>
                   <div>
                     <h5 className="font-semibold text-gray-300 mb-1">Recommendations:</h5>
                     <ul className="list-disc list-inside text-gray-400 space-y-1">
                       {state.report.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                     </ul>
                   </div>
                 </div>
               ) : <p className="text-gray-400">Waiting for analysis completion...</p>}
             </AgentCard>
             
             <AgentCard title="Long-Term Memory" icon={<MemoryIcon />} status={state.status} activeStates={['idle', 'planning', 'fetching', 'analyzing', 'monitoring', 'reporting', 'complete', 'error']}>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {state.memory.slice().reverse().map(entry => (
                    <div key={entry.id} className="bg-gray-700/50 p-2 rounded-md text-sm text-gray-300">
                      {entry.summary}
                    </div>
                  ))}
                </div>
             </AgentCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

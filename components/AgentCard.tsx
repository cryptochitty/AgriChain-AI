
import React from 'react';
import type { AgentStatus } from '../types';

interface AgentCardProps {
  title: string;
  icon: React.ReactNode;
  status: AgentStatus;
  activeStates: AgentStatus[];
  children: React.ReactNode;
}

export const AgentCard: React.FC<AgentCardProps> = ({ title, icon, status, activeStates, children }) => {
  const isActive = activeStates.includes(status);
  const isDone = activeStates.every(s => s < status);

  const getBorderColor = () => {
    if (isActive) return 'border-blue-500';
    if (isDone) return 'border-green-500';
    return 'border-gray-700';
  };

  return (
    <div className={`bg-gray-800/60 backdrop-blur-sm shadow-lg rounded-lg border-2 ${getBorderColor()} transition-all duration-500`}>
      <div className={`flex items-center p-4 border-b ${getBorderColor()} transition-all duration-500`}>
        <div className={`mr-4 p-2 rounded-full ${isActive ? 'bg-blue-500/20' : 'bg-gray-700/50'}`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-100">{title}</h3>
      </div>
      <div className="p-4 min-h-[100px]">
        {children}
      </div>
    </div>
  );
};

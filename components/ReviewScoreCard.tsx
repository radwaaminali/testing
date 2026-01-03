
import React from 'react';

interface ReviewScoreCardProps {
  label: string;
  score: number;
  icon: string;
  color: string;
}

export const ReviewScoreCard: React.FC<ReviewScoreCardProps> = ({ label, score, icon, color }) => {
  const getProgressColor = (s: number) => {
    if (s < 50) return 'bg-red-500';
    if (s < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white shadow-sm`}>
          <i className={icon}></i>
        </span>
        <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{score}</span>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${getProgressColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
};

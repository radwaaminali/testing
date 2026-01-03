
import React from 'react';
import { UILanguage, TRANSLATIONS } from '../types';

interface AnalysisProgressProps {
  currentStep: number;
  uiLang: UILanguage;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ currentStep, uiLang }) => {
  const t = TRANSLATIONS[uiLang];
  const steps = [
    { label: t.stepReading, icon: 'fa-folder-open' },
    { label: t.stepThinking, icon: 'fa-brain' },
    { label: t.stepStructuring, icon: 'fa-chart-pie' }
  ];

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="relative flex justify-between items-center">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 -z-10"></div>
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 transition-all duration-700 ease-in-out -translate-y-1/2 -z-10"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
              index <= currentStep 
                ? 'bg-indigo-600 border-indigo-600 text-white' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}>
              <i className={`fa-solid ${step.icon}`}></i>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 animate-pulse">
          {steps[currentStep].label}
        </p>
      </div>
    </div>
  );
};

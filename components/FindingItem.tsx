
import React from 'react';
import { ReviewFinding, Severity } from '../types';

interface FindingItemProps {
  finding: ReviewFinding;
}

export const FindingItem: React.FC<FindingItemProps> = ({ finding }) => {
  const getSeverityStyles = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL:
        return {
          bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50',
          badge: 'bg-red-500 text-white',
          text: 'text-red-900 dark:text-red-400',
          icon: 'fa-circle-exclamation'
        };
      case Severity.WARNING:
        return {
          bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50',
          badge: 'bg-amber-500 text-white',
          text: 'text-amber-900 dark:text-amber-400',
          icon: 'fa-triangle-exclamation'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50',
          badge: 'bg-blue-500 text-white',
          text: 'text-blue-900 dark:text-blue-400',
          icon: 'fa-lightbulb'
        };
    }
  };

  const styles = getSeverityStyles(finding.severity);

  return (
    <div className={`p-4 rounded-lg border ${styles.bg} space-y-3 transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles.badge}`}>
            {finding.severity}
          </span>
          <h4 className={`font-bold text-sm ${styles.text}`}>{finding.issue}</h4>
        </div>
        {finding.lineReference && (
          <span className="text-[10px] font-mono bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {finding.lineReference}
          </span>
        )}
      </div>
      
      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        {finding.description}
      </p>

      <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-md border border-slate-100 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2 mb-1.5">
          <i className="fa-solid fa-code-branch text-emerald-600 dark:text-emerald-500 text-xs"></i>
          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase">Suggested Fix</span>
        </div>
        <p className="text-xs font-mono text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">
          {finding.suggestedFix}
        </p>
      </div>
    </div>
  );
};

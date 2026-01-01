
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
          bg: 'bg-red-50 border-red-200',
          badge: 'bg-red-500 text-white',
          text: 'text-red-900',
          icon: 'fa-circle-exclamation'
        };
      case Severity.WARNING:
        return {
          bg: 'bg-amber-50 border-amber-200',
          badge: 'bg-amber-500 text-white',
          text: 'text-amber-900',
          icon: 'fa-triangle-exclamation'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-500 text-white',
          text: 'text-blue-900',
          icon: 'fa-lightbulb'
        };
    }
  };

  const styles = getSeverityStyles(finding.severity);

  return (
    <div className={`p-4 rounded-lg border ${styles.bg} space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles.badge}`}>
            {finding.severity}
          </span>
          <h4 className={`font-bold ${styles.text}`}>{finding.issue}</h4>
        </div>
        {finding.lineReference && (
          <span className="text-xs font-mono bg-white/50 px-2 py-1 rounded text-slate-600 border border-slate-200">
            {finding.lineReference}
          </span>
        )}
      </div>
      
      <p className="text-sm text-slate-700 leading-relaxed">
        {finding.description}
      </p>

      <div className="bg-white/60 p-3 rounded-md border border-slate-100">
        <div className="flex items-center gap-2 mb-1.5">
          <i className="fa-solid fa-code-branch text-emerald-600 text-xs"></i>
          <span className="text-xs font-bold text-emerald-800 uppercase">Suggested Fix</span>
        </div>
        <p className="text-sm font-mono text-slate-800 break-words whitespace-pre-wrap">
          {finding.suggestedFix}
        </p>
      </div>
    </div>
  );
};

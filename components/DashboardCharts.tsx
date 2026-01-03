
import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, 
  PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import { CodeReviewResult, UILanguage, TRANSLATIONS } from '../types';

interface DashboardChartsProps {
  result: CodeReviewResult;
  uiLang: UILanguage;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ result, uiLang }) => {
  const t = TRANSLATIONS[uiLang];

  const radarData = [
    { subject: 'Security', A: result.categories.security.score, fullMark: 100 },
    { subject: 'Bugs', A: result.categories.bugs.score, fullMark: 100 },
    { subject: 'Performance', A: result.categories.performance.score, fullMark: 100 },
    { subject: 'Quality', A: result.categories.quality.score, fullMark: 100 },
    { subject: 'Maintainability', A: result.categories.maintainability.score, fullMark: 100 },
  ];

  // Distribution of findings by severity
  const allFindings = [
    ...result.categories.security.findings,
    ...result.categories.bugs.findings,
    ...result.categories.performance.findings,
    ...result.categories.quality.findings,
    ...result.categories.maintainability.findings,
  ];

  const pieData = [
    { name: 'Critical', value: allFindings.filter(f => f.severity === 'Critical').length },
    { name: 'Warning', value: allFindings.filter(f => f.severity === 'Warning').length },
    { name: 'Suggestion', value: allFindings.filter(f => f.severity === 'Suggestion').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#e11d48', '#f59e0b', '#3b82f6'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{t.healthProfile}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Radar
                name="Score"
                dataKey="A"
                stroke="#4f46e5"
                fill="#4f46e5"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{t.issueDistribution}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: 'none', 
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: '#fff'
                }} 
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LANGUAGES, CodeReviewResult, SupportedLanguage, ReviewCategory, ProjectFile, ProjectExplanation, ProjectDevelopmentResult, UILanguage, TRANSLATIONS, SecurityAuditResult, PerformanceOptimizationResult, HistoryItem } from './types.ts';
import { getCodeReview, applyFixes, explainProject, suggestDevelopment, getChatConsultation, getSecurityAudit, getPerformanceOptimization } from './services/geminiService.ts';
import { ReviewScoreCard } from './components/ReviewScoreCard.tsx';
import { FindingItem } from './components/FindingItem.tsx';
import { AnalysisProgress } from './components/AnalysisProgress.tsx';
import { DashboardCharts } from './components/DashboardCharts.tsx';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const CHAT_STORAGE_KEY = 'faang_reviewer_chat_history';
const HISTORY_STORAGE_KEY = 'faang_reviewer_app_history';
const THEME_KEY = 'faang_theme';

const App: React.FC = () => {
  const [uiLanguage, setUiLanguage] = useState<UILanguage>('en');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [code, setCode] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0); // For robust drag tracking
  
  const [fixedContent, setFixedContent] = useState<string | ProjectFile[] | null>(null);
  const [explanation, setExplanation] = useState<ProjectExplanation | null>(null);
  const [securityAudit, setSecurityAudit] = useState<SecurityAuditResult | null>(null);
  const [performanceResult, setPerformanceResult] = useState<PerformanceOptimizationResult | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [fixing, setFixing] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'fixed'>('original');
  const [rightTab, setRightTab] = useState<'review' | 'security' | 'performance' | 'insight' | 'consult' | 'history'>('review');
  
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[uiLanguage];

  useEffect(() => {
    document.documentElement.dir = uiLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = uiLanguage;
  }, [uiLanguage]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const toggleTheme = () => setIsDark(!isDark);

  const isLikelyText = (file: File) => {
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.exe', '.dll', '.so', '.pyc', '.node', '.ico'];
    if (binaryExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) return false;
    if (file.type && (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/'))) return false;
    return true;
  };

  const getProjectName = () => {
    if (uploadedFiles.length > 0) return uploadedFiles[0].name.split('.')[0] + (uploadedFiles.length > 1 ? ` +${uploadedFiles.length - 1}` : '');
    if (code.trim()) return "Snippet " + code.trim().substring(0, 10) + "...";
    return "Untitled Project";
  };

  const addToHistory = (type: 'review' | 'security' | 'performance', score: number, data: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type,
      projectName: getProjectName(),
      score,
      data,
      isFavorite: false,
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
      rawCode: uploadedFiles.length === 0 ? code : undefined
    };
    setHistory(prev => [newItem, ...prev].slice(0, 30)); 
  };

  const deleteHistoryItem = (id: string) => setHistory(prev => prev.filter(item => item.id !== id));
  const toggleFavorite = (id: string) => setHistory(prev => prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));

  const loadHistoryItem = (item: HistoryItem) => {
    if (item.files) {
      setUploadedFiles(item.files);
      setCode('');
    } else if (item.rawCode) {
      setCode(item.rawCode);
      setUploadedFiles([]);
    }

    if (item.type === 'review') {
      setResult(item.data);
      setRightTab('review');
    } else if (item.type === 'security') {
      setSecurityAudit(item.data);
      setRightTab('security');
    } else if (item.type === 'performance') {
      setPerformanceResult(item.data);
      setRightTab('performance');
    }
    setViewMode('original');
  };

  // Improved recursive file traversal for folders on drop
  const traverseFileTree = async (item: any, path: string = ""): Promise<ProjectFile[]> => {
    const files: ProjectFile[] = [];
    if (item.isFile) {
      const file = await new Promise<File>((resolve) => item.file(resolve));
      if (isLikelyText(file) && file.size < 800000) {
        try {
          const content = await file.text();
          if (!content.includes('\u0000')) {
            files.push({ name: file.name, path: path + file.name, content });
          }
        } catch (e) {}
      }
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        dirReader.readEntries((results: any[]) => resolve(results));
      });
      for (const entry of entries) {
        const result = await traverseFileTree(entry, path + item.name + "/");
        files.push(...result);
      }
    }
    return files;
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const items = e.dataTransfer.items;
    if (!items) return;

    const allFiles: ProjectFile[] = [];
    const promises = [];

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        promises.push(traverseFileTree(entry));
      }
    }

    const results = await Promise.all(promises);
    results.forEach(fileList => allFiles.push(...fileList));

    if (allFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...allFiles]);
      setFixedContent(null);
      setCode('');
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: ProjectFile[] = [];
    const ignoreList = ['node_modules', '.git', 'dist', 'build', '.next', 'package-lock.json'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = (file as any).webkitRelativePath || file.name;
      
      if (ignoreList.some(ignore => path.includes(ignore))) continue;
      if (file.size > 800000 || !isLikelyText(file)) continue;

      try {
        const content = await file.text();
        if (content.includes('\u0000')) continue;
        newFiles.push({ name: file.name, path: path, content: content });
      } catch (e) {
        continue;
      }
    }

    if (newFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setFixedContent(null);
      setCode('');
    }
    event.target.value = '';
  };

  const removeFile = (path: string) => setUploadedFiles(prev => prev.filter(f => f.path !== path));

  const handleReview = async () => {
    const input = uploadedFiles.length > 0 ? uploadedFiles : code;
    if (typeof input === 'string' && !input.trim()) return;
    setLoading(true);
    setAnalysisStep(0);
    setError(null);
    setFixedContent(null);
    setViewMode('original');
    
    try {
      setTimeout(() => setAnalysisStep(1), 800);
      const review = await getCodeReview(input, language, uiLanguage);
      setAnalysisStep(2);
      setTimeout(() => {
        setResult(review);
        addToHistory('review', review.overallScore, review);
        setRightTab('review');
        setLoading(false);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
      setLoading(false);
    }
  };

  const handleSecurityAudit = async () => {
    const input = uploadedFiles.length > 0 ? uploadedFiles : code;
    if (typeof input === 'string' && !input.trim()) return;
    setAuditing(true);
    setError(null);
    try {
      const audit = await getSecurityAudit(input, language, uiLanguage);
      setSecurityAudit(audit);
      addToHistory('security', audit.securityScore, audit);
      setRightTab('security');
    } catch (err: any) {
      setError('Security audit failed: ' + err.message);
    } finally {
      setAuditing(false);
    }
  };

  const handlePerformanceOptimization = async () => {
    const input = uploadedFiles.length > 0 ? uploadedFiles : code;
    if (typeof input === 'string' && !input.trim()) return;
    setOptimizing(true);
    setError(null);
    try {
      const optimization = await getPerformanceOptimization(input, language, uiLanguage);
      setPerformanceResult(optimization);
      addToHistory('performance', optimization.performanceScore, optimization);
      setRightTab('performance');
    } catch (err: any) {
      setError('Performance analysis failed: ' + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleChatSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    const input = uploadedFiles.length > 0 ? uploadedFiles : code;
    const context = (uploadedFiles.length === 0 && !code.trim()) 
      ? "No project code uploaded yet." 
      : (typeof input === 'string' ? input : input.map(f => `File ${f.path}:\n${f.content}`).join('\n\n'));
    
    const historyCtx = chatMessages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    try {
      const response = await getChatConsultation(historyCtx, userMsg, context, uiLanguage);
      setChatMessages(prev => [...prev, { role: 'model', text: response || '' }]);
    } catch (err: any) {
      setError('Chat failed: ' + err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExplain = async () => {
    const input = uploadedFiles.length > 0 ? uploadedFiles : code;
    if (typeof input === 'string' && !input.trim()) return;
    setExplaining(true);
    setError(null);
    try {
      const info = await explainProject(input, language, uiLanguage);
      setExplanation(info);
      setRightTab('insight');
    } catch (err: any) {
      setError('Explanation failed: ' + err.message);
    } finally {
      setExplaining(false);
    }
  };

  const handleApplyFixes = async () => {
    if (!result) return;
    const input = uploadedFiles.length > 0 ? uploadedFiles : code;
    setFixing(true);
    setError(null);
    try {
      const fixed = await applyFixes(input, result, language);
      setFixedContent(fixed);
      setViewMode('fixed');
    } catch (err: any) {
      setError('Failed to apply fixes: ' + err.message);
    } finally {
      setFixing(false);
    }
  };

  const clearChatHistory = () => {
    setChatMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const clearAll = () => {
    setCode('');
    setUploadedFiles([]);
    setResult(null);
    setFixedContent(null);
    setExplanation(null);
    setSecurityAudit(null);
    setPerformanceResult(null);
    setError(null);
    setViewMode('original');
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors ${uiLanguage === 'ar' ? 'font-sans' : ''}`}>
      <header className="bg-slate-900 dark:bg-black text-white py-4 px-6 shadow-lg border-b border-slate-700 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-code-merge text-xl text-white"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={toggleTheme} className="bg-slate-800 hover:bg-slate-700 p-1.5 px-3 rounded text-[10px] font-black border border-slate-700 transition-colors uppercase tracking-widest text-amber-400">
              {isDark ? <i className="fa-solid fa-sun mr-1"></i> : <i className="fa-solid fa-moon mr-1"></i>}
              {isDark ? t.lightMode : t.darkMode}
            </button>
            <button onClick={() => setUiLanguage(prev => prev === 'en' ? 'ar' : 'en')} className="bg-slate-800 hover:bg-slate-700 p-1.5 px-3 rounded text-[10px] font-black border border-slate-700 transition-colors uppercase tracking-widest text-indigo-400">
              {uiLanguage === 'en' ? 'العربية' : 'English'}
            </button>
            <select className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none" value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}>
              {LANGUAGES.map(lang => (<option key={lang.value} value={lang.value}>{lang.label}</option>))}
            </select>
            <button onClick={() => folderInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 p-1.5 px-3 rounded text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors">
              <i className="fa-solid fa-cloud-arrow-up text-amber-400"></i>
              <span>{t.upload}</span>
            </button>
            <input type="file" ref={folderInputRef} onChange={handleFileInputChange} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} />
            <div className="flex gap-2">
              <button onClick={handleExplain} disabled={loading || explaining || auditing || optimizing || (!code.trim() && uploadedFiles.length === 0)} className="bg-slate-100 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2">
                {explaining ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-lightbulb text-amber-500"></i>}
                {t.explain}
              </button>
              <button onClick={handlePerformanceOptimization} disabled={loading || explaining || auditing || optimizing || (!code.trim() && uploadedFiles.length === 0)} className="bg-emerald-50 dark:bg-emerald-900/20 hover:bg-white dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2">
                {optimizing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-gauge-high text-emerald-500"></i>}
                {t.performance}
              </button>
              <button onClick={handleSecurityAudit} disabled={loading || explaining || auditing || optimizing || (!code.trim() && uploadedFiles.length === 0)} className="bg-rose-50 dark:bg-rose-900/20 hover:bg-white dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2">
                {auditing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-shield-halved text-rose-500"></i>}
                {t.security}
              </button>
              <button onClick={handleReview} disabled={loading || fixing || auditing || optimizing || (!code.trim() && uploadedFiles.length === 0)} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-1.5 rounded-md text-xs font-black transition-all flex items-center gap-2 shadow-lg">
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt-lightning"></i>}
                {t.review}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
        <div className="flex flex-col gap-4 h-full relative">
          <div 
            className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border-2 overflow-hidden min-h-0 transition-all ${
              isDragging ? 'border-indigo-500 border-dashed bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => setViewMode('original')} className={`text-[10px] font-black uppercase px-3 py-1 rounded transition-colors ${viewMode === 'original' ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{t.original}</button>
                {fixedContent && (<button onClick={() => setViewMode('fixed')} className={`text-[10px] font-black uppercase px-3 py-1 rounded transition-colors ${viewMode === 'fixed' ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{t.fixed}</button>)}
              </div>
              <button onClick={clearAll} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase transition-colors">{t.reset}</button>
            </div>
            
            <div className={`flex-1 bg-slate-900 overflow-y-auto custom-scrollbar font-mono text-sm text-slate-300 ${uiLanguage === 'ar' ? 'text-left' : ''}`} dir="ltr">
              {viewMode === 'original' ? (
                uploadedFiles.length > 0 ? (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-500">{t.filesUploaded} ({uploadedFiles.length})</span>
                    </div>
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="bg-slate-800/50 p-2 px-3 rounded border border-slate-700 flex justify-between items-center group animate-in slide-in-from-left-2 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <i className="fa-solid fa-file-code text-indigo-400 shrink-0"></i>
                          <span className="truncate text-[11px] font-medium" title={f.path}>{f.path}</span>
                        </div>
                        <button onClick={() => removeFile(f.path)} className="text-slate-500 hover:text-rose-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/10 rounded">
                          <i className="fa-solid fa-trash-can text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full relative group">
                    <textarea 
                      className="w-full h-full p-4 bg-transparent resize-none focus:outline-none placeholder:text-slate-700 z-10 relative" 
                      placeholder={t.placeholder} 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                    />
                    {!code && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 dark:text-slate-800 pointer-events-none group-hover:text-indigo-900/20 transition-colors">
                        <i className="fa-solid fa-cloud-arrow-up text-6xl mb-4"></i>
                        <p className="text-sm font-black uppercase tracking-widest">{t.dropFiles}</p>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="p-4 space-y-4">
                  {typeof fixedContent === 'string' ? (
                    <pre className="whitespace-pre-wrap">{fixedContent}</pre>
                  ) : (
                    Array.isArray(fixedContent) && fixedContent.map((f, i) => (
                      <div key={i} className="space-y-2">
                        <div className="bg-emerald-900/30 text-emerald-400 p-1 px-3 rounded text-[10px] font-bold uppercase border border-emerald-800/50">{f.path}</div>
                        <pre className="p-2 whitespace-pre-wrap text-xs">{f.content}</pre>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-indigo-600/10 backdrop-blur-[4px] flex items-center justify-center pointer-events-none">
                 <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl border-2 border-indigo-500 flex flex-col items-center animate-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
                      <i className="fa-solid fa-file-import text-4xl text-indigo-600"></i>
                    </div>
                    <p className="text-xl font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{t.dropFiles}</p>
                 </div>
              </div>
            )}
          </div>
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-lg flex items-start gap-3 text-rose-800 dark:text-rose-400 animate-in slide-in-from-top-2 transition-colors">
              <i className="fa-solid fa-circle-xmark mt-1"></i>
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto max-h-full pr-2 custom-scrollbar">
          {(loading || explaining || auditing || optimizing) && (
            <div className="h-full flex flex-col items-center justify-center p-12 space-y-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
              <AnalysisProgress currentStep={analysisStep} uiLang={uiLanguage} />
            </div>
          )}
          
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto pb-1 no-scrollbar transition-colors">
              <button onClick={() => setRightTab('review')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${rightTab === 'review' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>{t.review}</button>
              <button onClick={() => setRightTab('performance')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${rightTab === 'performance' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>{t.performance}</button>
              <button onClick={() => setRightTab('security')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${rightTab === 'security' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>{t.security}</button>
              <button onClick={() => setRightTab('insight')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${rightTab === 'insight' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>{t.architecture}</button>
              <button onClick={() => setRightTab('consult')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${rightTab === 'consult' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>{t.consult}</button>
              <button onClick={() => setRightTab('history')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${rightTab === 'history' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>{t.history}</button>
            </div>

            {rightTab === 'history' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{t.history}</h3>
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <i className="fa-solid fa-clock-rotate-left text-4xl text-slate-300 mb-2"></i>
                    <p className="text-xs text-slate-400 font-bold">{t.emptyHistory}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map(item => (
                      <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-indigo-500 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.type === 'review' ? 'bg-indigo-500' : item.type === 'security' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                            <span className="text-[10px] font-black uppercase text-slate-400">{item.type}</span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                            {item.files && <span className="text-[9px] bg-indigo-50 dark:bg-indigo-900/20 px-1.5 rounded text-indigo-600 dark:text-indigo-400 font-bold">{item.files.length} Files</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleFavorite(item.id)} className={`transition-colors ${item.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}>
                              <i className={`fa-solid fa-star ${item.isFavorite ? '' : 'fa-regular'}`}></i>
                            </button>
                            <button onClick={() => deleteHistoryItem(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{item.projectName}</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{item.score}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                          </div>
                          <button onClick={() => loadHistoryItem(item)} className="bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 p-1.5 px-3 rounded text-[10px] font-black uppercase transition-all shadow-sm">
                            {t.view}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rightTab === 'review' && result && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-slate-900 dark:bg-black text-white p-6 rounded-2xl shadow-xl border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-4xl font-black">{result.overallScore}<span className="text-slate-600 text-xl">/100</span></h2>
                      <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">{t.healthScore}</p>
                    </div>
                    <button onClick={handleApplyFixes} disabled={fixing} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 shadow-lg transition-all">
                      {fixing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-magic-wand-sparkles"></i>}
                      {t.applyFixes}
                    </button>
                  </div>
                  <p className="text-slate-300 text-xs italic leading-relaxed">"{result.executiveSummary}"</p>
                </div>

                <DashboardCharts result={result} uiLang={uiLanguage} />

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <ReviewScoreCard label="Security" score={result.categories.security.score} icon="fa-solid fa-lock" color="bg-rose-500" />
                  <ReviewScoreCard label="Bugs" score={result.categories.bugs.score} icon="fa-solid fa-bug" color="bg-orange-500" />
                  <ReviewScoreCard label="Perf" score={result.categories.performance.score} icon="fa-solid fa-bolt" color="bg-amber-500" />
                  <ReviewScoreCard label="Quality" score={result.categories.quality.score} icon="fa-solid fa-gem" color="bg-emerald-500" />
                  <ReviewScoreCard label="Docs" score={result.categories.maintainability.score} icon="fa-solid fa-wrench" color="bg-sky-500" />
                </div>

                <div className="space-y-10">
                  {(Object.entries(result.categories) as [string, ReviewCategory][]).map(([key, cat]) => (
                    <div key={key} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${key === 'security' ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
                          {key} Findings
                        </h3>
                        <span className="text-[10px] text-slate-400 font-bold">{cat.findings.length} Issues</span>
                      </div>
                      {cat.findings.map((f, i) => <FindingItem key={i} finding={f} />)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {rightTab === 'performance' && performanceResult && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-slate-900 dark:bg-black text-white p-6 rounded-2xl shadow-xl flex items-center justify-between border border-slate-800">
                   <div>
                      <h2 className="text-4xl font-black">{performanceResult.performanceScore}<span className="text-slate-600 text-xl">/100</span></h2>
                      <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">{t.perfScore}</p>
                    </div>
                    <i className="fa-solid fa-gauge-high text-5xl text-emerald-500/50"></i>
                </div>
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.bottlenecks}</h3>
                   {performanceResult.bottlenecks.map((b, i) => (
                     <div key={i} className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm border-l-4 transition-colors ${
                       b.impact === 'High' ? 'border-l-rose-600' : 
                       b.impact === 'Medium' ? 'border-l-orange-500' : 'border-l-emerald-400'
                     }`}>
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                b.impact === 'High' ? 'bg-rose-100 text-rose-700' :
                                b.impact === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>{b.area}</span>
                              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">{b.impact} Impact Bottleneck</h4>
                           </div>
                           <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">{t.complexity}: {b.complexity}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 font-medium"><strong className="text-slate-800 dark:text-slate-200">Issue:</strong> {b.bottleneck}</p>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                           <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{b.optimization}</p>
                           <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-emerald-400 overflow-x-auto" dir="ltr">
                             <pre className="whitespace-pre-wrap">{b.optimizedCode}</pre>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {rightTab === 'security' && securityAudit && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-slate-900 dark:bg-black text-white p-6 rounded-2xl shadow-xl flex items-center justify-between border border-slate-800">
                   <div>
                      <h2 className="text-4xl font-black">{securityAudit.securityScore}<span className="text-slate-600 text-xl">/100</span></h2>
                      <p className="text-xs text-rose-400 font-bold uppercase tracking-widest">{t.securityScore}</p>
                    </div>
                    <i className="fa-solid fa-shield-virus text-5xl text-rose-500/50"></i>
                </div>
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.vulnerabilities}</h3>
                   {securityAudit.vulnerabilities.map((v, i) => (
                     <div key={i} className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm border-l-4 transition-colors ${
                       v.severity === 'Critical' ? 'border-l-rose-600' : 
                       v.severity === 'High' ? 'border-l-orange-500' : 'border-l-amber-400'
                     }`}>
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                v.severity === 'Critical' ? 'bg-rose-100 text-rose-700' :
                                v.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                              }`}>{v.severity}</span>
                              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">{v.type}</h4>
                           </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{v.description}</p>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                           <p className="text-[10px] text-slate-700 dark:text-slate-300 italic font-medium"><strong className="text-rose-500 uppercase not-italic">Vector:</strong> {v.attackVector}</p>
                           <p className="text-xs text-slate-800 dark:text-slate-200 font-bold"><strong className="text-emerald-500 uppercase">Fix:</strong> {v.mitigation}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {rightTab === 'consult' && (
              <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                <div className="bg-slate-900 dark:bg-black p-4 text-white flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest">{t.consult}</span>
                  <button onClick={clearChatHistory} className="text-[10px] font-bold text-slate-400 hover:text-rose-400 flex items-center gap-2"><i className="fa-solid fa-trash-can"></i> {t.clearChat}</button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
                  {chatMessages.length === 0 && (
                     <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                           <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold">{t.consultWelcome}</p>
                        </div>
                     </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-2xl shadow-sm max-w-[85%] text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChatSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={t.chatPlaceholder} className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" disabled={chatLoading} />
                  <button type="submit" disabled={!chatInput.trim() || chatLoading} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md"><i className="fa-solid fa-paper-plane text-xs"></i></button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 text-center transition-colors">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.footer}</p>
      </footer>
    </div>
  );
};

export default App;

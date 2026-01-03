
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LANGUAGES, CodeReviewResult, SupportedLanguage, ReviewCategory, ProjectFile, ProjectExplanation, ProjectDevelopmentResult, UILanguage, TRANSLATIONS } from './types.ts';
import { getCodeReview, applyFixes, explainProject, suggestDevelopment, getChatConsultation } from './services/geminiService.ts';
import { ReviewScoreCard } from './components/ReviewScoreCard.tsx';
import { FindingItem } from './components/FindingItem.tsx';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const STORAGE_KEY = 'faang_reviewer_chat_history';

const App: React.FC = () => {
  const [uiLanguage, setUiLanguage] = useState<UILanguage>('en');
  const [code, setCode] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([]);
  const [fixedContent, setFixedContent] = useState<string | ProjectFile[] | null>(null);
  const [explanation, setExplanation] = useState<ProjectExplanation | null>(null);
  const [development, setDevelopment] = useState<ProjectDevelopmentResult | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'fixed'>('original');
  const [rightTab, setRightTab] = useState<'review' | 'insight' | 'growth' | 'consult'>('review');
  
  // Chat State with localStorage initialization
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load chat history", e);
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

  // Persistent storage sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatMessages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: ProjectFile[] = [];
    const ignoreList = ['node_modules', '.git', 'dist', 'build', '.next', 'package-lock.json', '.ico', '.png', '.jpg'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = (file as any).webkitRelativePath || file.name;
      if (ignoreList.some(ignore => path.includes(ignore))) continue;
      if (file.size > 300000) continue; 

      try {
        const content = await file.text();
        newFiles.push({ name: file.name, path: path, content: content });
      } catch (e) {
        console.error(`Could not read file: ${path}`);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setFixedContent(null);
    setExplanation(null);
    setDevelopment(null);
    if (event.target) event.target.value = '';
  };

  const handleReview = async () => {
    const input = uploadedFiles.length > 0 ? uploadedFiles : code;
    if (typeof input === 'string' && !input.trim()) return;
    setLoading(true);
    setError(null);
    setFixedContent(null);
    setViewMode('original');
    try {
      const review = await getCodeReview(input, language, uiLanguage);
      setResult(review);
      setRightTab('review');
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setLoading(false);
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
    // Provide some context even if no files/code yet, but preferably with project context
    const context = (uploadedFiles.length === 0 && !code.trim()) 
      ? "No project code uploaded yet." 
      : (typeof input === 'string' ? input : input.map(f => `File ${f.path}:\n${f.content}`).join('\n\n'));
    
    const history = chatMessages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    try {
      const response = await getChatConsultation(history, userMsg, context, uiLanguage);
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

  const handleSuggestGrowth = async () => {
    const input = uploadedFiles.length > 0 ? uploadedFiles : code;
    if (typeof input === 'string' && !input.trim()) return;
    setSuggesting(true);
    setError(null);
    try {
      const dev = await suggestDevelopment(input, language, uiLanguage);
      setDevelopment(dev);
      setRightTab('growth');
    } catch (err: any) {
      setError('Growth suggestion failed: ' + err.message);
    } finally {
      setSuggesting(false);
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
    localStorage.removeItem(STORAGE_KEY);
  };

  const clearAll = () => {
    setCode('');
    setUploadedFiles([]);
    setResult(null);
    setFixedContent(null);
    setExplanation(null);
    setDevelopment(null);
    setError(null);
    setViewMode('original');
  };

  const toggleLanguage = () => {
    setUiLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 ${uiLanguage === 'ar' ? 'font-sans' : ''}`}>
      <header className="bg-slate-900 text-white py-4 px-6 shadow-lg border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-code-merge text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={toggleLanguage} className="bg-slate-800 hover:bg-slate-700 p-1.5 px-3 rounded text-[10px] font-black border border-slate-700 transition-colors uppercase tracking-widest text-indigo-400">
              {uiLanguage === 'en' ? 'العربية' : 'English'}
            </button>
            <select className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none" value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}>
              {LANGUAGES.map(lang => (<option key={lang.value} value={lang.value}>{lang.label}</option>))}
            </select>
            <button onClick={() => folderInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 p-1.5 px-3 rounded text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors">
              <i className="fa-solid fa-folder-tree text-amber-400"></i>
              <span>{t.upload}</span>
            </button>
            <input type="file" ref={folderInputRef} onChange={handleFileUpload} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} />
            <div className="flex gap-2">
              <button onClick={handleExplain} disabled={loading || explaining || suggesting || (!code.trim() && uploadedFiles.length === 0)} className="bg-slate-100 hover:bg-white text-slate-800 border border-slate-200 px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2">
                {explaining ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-lightbulb text-amber-500"></i>}
                {t.explain}
              </button>
              <button onClick={handleSuggestGrowth} disabled={loading || explaining || suggesting || (!code.trim() && uploadedFiles.length === 0)} className="bg-indigo-50 hover:bg-white text-indigo-700 border border-indigo-200 px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2">
                {suggesting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rocket text-indigo-500"></i>}
                {t.growth}
              </button>
              <button onClick={handleReview} disabled={loading || fixing || (!code.trim() && uploadedFiles.length === 0)} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-1.5 rounded-md text-sm font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt-lightning"></i>}
                {t.review}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => setViewMode('original')} className={`text-[10px] font-black uppercase px-3 py-1 rounded transition-colors ${viewMode === 'original' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{t.original}</button>
                {fixedContent && (<button onClick={() => setViewMode('fixed')} className={`text-[10px] font-black uppercase px-3 py-1 rounded transition-colors ${viewMode === 'fixed' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{t.fixed}</button>)}
              </div>
              <button onClick={clearAll} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase transition-colors">{t.reset}</button>
            </div>
            <div className={`flex-1 bg-slate-900 overflow-y-auto custom-scrollbar font-mono text-sm text-slate-300 ${uiLanguage === 'ar' ? 'text-left' : ''}`} dir="ltr">
              {viewMode === 'original' ? (
                uploadedFiles.length > 0 ? (
                  <div className="p-4 space-y-2">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="bg-slate-800/50 p-2 px-3 rounded border border-slate-700 flex justify-between items-center group">
                        <span className="truncate text-xs">{f.path}</span>
                        <i className="fa-solid fa-file-code text-indigo-400"></i>
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea className="w-full h-full p-4 bg-transparent resize-none focus:outline-none placeholder:text-slate-700" placeholder={t.placeholder} value={code} onChange={(e) => setCode(e.target.value)} />
                )
              ) : (
                <div className="p-4 space-y-4">
                  {typeof fixedContent === 'string' ? (
                    <pre className="whitespace-pre-wrap">{fixedContent}</pre>
                  ) : (
                    Array.isArray(fixedContent) && fixedContent.map((f, i) => (
                      <div key={i} className="space-y-2">
                        <div className="bg-emerald-900/30 text-emerald-400 p-1 px-3 rounded text-[10px] font-bold uppercase border border-emerald-800/50">{f.path}</div>
                        <pre className="p-2 whitespace-pre-wrap">{f.content}</pre>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-start gap-3 text-rose-800 animate-in slide-in-from-top-2">
              <i className="fa-solid fa-circle-xmark mt-1"></i>
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-2 custom-scrollbar">
          {(loading || explaining || suggesting) && (
            <div className="h-full flex flex-col items-center justify-center p-12 space-y-4 bg-white rounded-xl border border-slate-200">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.analyzing}</p>
            </div>
          )}
          
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex border-b border-slate-200 gap-6">
              <button onClick={() => setRightTab('review')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${rightTab === 'review' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t.review}</button>
              <button onClick={() => setRightTab('insight')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${rightTab === 'insight' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t.architecture}</button>
              <button onClick={() => setRightTab('growth')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${rightTab === 'growth' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t.roadmap}</button>
              <button onClick={() => setRightTab('consult')} className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${rightTab === 'consult' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t.consult}</button>
            </div>

            {rightTab === 'consult' && (
              <div className="flex flex-col h-[600px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-widest">{t.consult}</span>
                  </div>
                  <button 
                    onClick={clearChatHistory} 
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-400 flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    {t.clearChat}
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 custom-scrollbar">
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                      <p className="text-xs text-slate-700 leading-relaxed font-bold">{t.consultWelcome}</p>
                    </div>
                  </div>

                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-2xl shadow-sm max-w-[85%] text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={t.chatPlaceholder}
                    className="flex-1 bg-slate-100 border-none rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    disabled={chatLoading}
                  />
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim() || chatLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  >
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                  </button>
                </form>
              </div>
            )}

            {rightTab === 'review' && result && (
              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                  <div className={`flex justify-between items-start mb-4 ${uiLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
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
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
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
            
            {rightTab === 'insight' && explanation && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                  <i className={`fa-solid fa-compass absolute text-white/10 text-9xl ${uiLanguage === 'ar' ? '-left-4 -bottom-4' : '-right-4 -bottom-4'}`}></i>
                  <h2 className="text-3xl font-black mb-2">{explanation.title}</h2>
                  <p className="text-indigo-100 text-sm leading-relaxed max-w-lg">{explanation.briefSummary}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><i className="fa-solid fa-layer-group text-indigo-500"></i> {t.architecture}</h4>
                    <p className="text-sm text-slate-700 font-bold">{explanation.architecturePattern}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><i className="fa-solid fa-microchip text-indigo-500"></i> {t.techStack}</h4>
                    <div className="flex flex-wrap gap-2">
                      {explanation.techStack.map((tech, i) => (<span key={i} className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase">{tech}</span>))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'growth' && development && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-12">
                <div className={`bg-slate-900 text-white p-8 rounded-2xl shadow-xl border-indigo-500 ${uiLanguage === 'ar' ? 'border-r-4' : 'border-l-4'}`}>
                  <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">{t.vision}</h2>
                  <p className="text-lg font-bold leading-tight">{development.visionStatement}</p>
                </div>
                <div className="space-y-4">
                  {development.suggestions.map((suggestion, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className={`bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between ${uiLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-3 ${uiLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                            suggestion.category === 'Feature' ? 'bg-indigo-100 text-indigo-700' :
                            suggestion.category === 'Scalability' ? 'bg-amber-100 text-amber-700' :
                            suggestion.category === 'UX' ? 'bg-emerald-100 text-emerald-700' :
                            suggestion.category === 'Architecture' ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-700'
                          }`}>{suggestion.category}</span>
                          <h3 className="text-sm font-black text-slate-800">{suggestion.title}</h3>
                        </div>
                        <div className={`flex gap-2 ${uiLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                           <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${suggestion.impact === 'High' ? 'border-rose-200 text-rose-600 bg-rose-50' : 'border-slate-200 text-slate-500'}`}>{t.impact}: {suggestion.impact}</span>
                           <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 bg-white">{t.dev}: {suggestion.complexity}</span>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{suggestion.description}</p>
                        {suggestion.suggestedCode && (
                          <div className="mt-4 space-y-2">
                            <p className="text-[10px] text-slate-500 font-black uppercase">{t.implementation}</p>
                            <div className="bg-slate-900 rounded-lg p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-inner border border-slate-800" dir="ltr">
                              <pre className="whitespace-pre-wrap">{suggestion.suggestedCode}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 py-3 text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.footer}</p>
      </footer>
    </div>
  );
};

export default App;

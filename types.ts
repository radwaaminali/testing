
export enum Severity {
  CRITICAL = 'Critical',
  WARNING = 'Warning',
  SUGGESTION = 'Suggestion'
}

export interface ProjectFile {
  name: string;
  path: string;
  content: string;
}

export interface SecurityVulnerability {
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  cwe: string;
  description: string;
  attackVector: string;
  mitigation: string;
}

export interface SecurityAuditResult {
  securityScore: number;
  vulnerabilities: SecurityVulnerability[];
  dataSensitivityAnalysis: string;
  complianceSummary: string;
}

export interface PerformanceIssue {
  area: 'Memory' | 'CPU' | 'Network' | 'Database' | 'Bundle Size';
  impact: 'High' | 'Medium' | 'Low';
  complexity: string; // e.g., O(n^2)
  bottleneck: string;
  optimization: string;
  optimizedCode: string;
}

export interface PerformanceOptimizationResult {
  performanceScore: number;
  bottlenecks: PerformanceIssue[];
  resourceAnalysis: string;
  scalabilityVerdict: string;
}

export interface ReviewFinding {
  lineReference?: string;
  issue: string;
  description: string;
  suggestedFix: string;
  severity: Severity;
}

export interface ReviewCategory {
  score: number;
  summary: string;
  findings: ReviewFinding[];
}

export interface CodeReviewResult {
  overallScore: number;
  executiveSummary: string;
  categories: {
    security: ReviewCategory;
    bugs: ReviewCategory;
    performance: ReviewCategory;
    quality: ReviewCategory;
    maintainability: ReviewCategory;
  };
}

export interface ProjectExplanation {
  title: string;
  briefSummary: string;
  techStack: string[];
  architecturePattern: string;
  coreLogicFlow: string;
  keyModules: {
    name: string;
    responsibility: string;
  }[];
}

export interface DevelopmentSuggestion {
  category: 'Feature' | 'Scalability' | 'UX' | 'Architecture' | 'DX';
  title: string;
  impact: 'High' | 'Medium' | 'Low';
  complexity: 'Easy' | 'Medium' | 'Hard';
  description: string;
  reasoning: string;
  suggestedCode?: string;
}

export interface ProjectDevelopmentResult {
  visionStatement: string;
  suggestions: DevelopmentSuggestion[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'review' | 'security' | 'performance';
  projectName: string;
  score: number;
  data: any;
  isFavorite: boolean;
  files?: ProjectFile[];
  rawCode?: string;
}

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'java' | 'cpp' | 'csharp' | 'ruby' | 'rust';

export const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' }
];

export type UILanguage = 'en' | 'ar';

export const TRANSLATIONS = {
  en: {
    title: 'FAANG Reviewer Pro',
    subtitle: 'High Performance & Growth Pipeline',
    upload: 'Upload Files',
    explain: 'Explain',
    growth: 'Growth',
    review: 'Review',
    security: 'Security',
    performance: 'Optimize',
    consult: 'AI Consultant',
    original: 'Original',
    fixed: 'Fixed Version ✨',
    reset: 'Reset',
    placeholder: 'Paste code here or drag files...',
    dropFiles: 'Drop files or folder here...',
    analyzing: 'Deep Analysis...',
    ready: 'Ready for Analysis',
    readySub: 'Run a Review for bugs, Security Audit, or Performance Optimization.',
    architecture: 'Architecture',
    techStack: 'Tech Stack',
    roadmap: 'Roadmap 🚀',
    healthScore: 'Health Score',
    securityScore: 'Security Score',
    perfScore: 'Performance Score',
    applyFixes: 'Apply Fixes',
    vision: 'Product Vision',
    impact: 'Impact',
    dev: 'Dev',
    reasoning: 'Business Reasoning',
    implementation: 'Implementation Code',
    footer: 'FAANG AI Engine • Performance Optimization Active',
    chatPlaceholder: 'Ask about complexity, memory...',
    send: 'Send',
    aiTyping: 'Thinking...',
    consultWelcome: 'Senior Staff Engineer here. How can I help optimize your algorithms or systems?',
    clearChat: 'Clear History',
    vulnerabilities: 'Vulnerabilities',
    dataSensitivity: 'Data Sensitivity',
    compliance: 'Compliance',
    riskCritical: 'Critical Risk',
    riskHigh: 'High Risk',
    riskMedium: 'Medium Risk',
    riskLow: 'Low Risk',
    bottlenecks: 'Performance Bottlenecks',
    resourceUsage: 'Resource Analysis',
    scalability: 'Scalability Verdict',
    complexity: 'Big O Complexity',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    healthProfile: 'Code Health Profile',
    issueDistribution: 'Issue Distribution',
    stepReading: 'Reading source files...',
    stepThinking: 'Gemini AI is analyzing logic...',
    stepStructuring: 'Structuring final report...',
    filesUploaded: 'Files Uploaded',
    noFiles: 'No files uploaded yet',
    history: 'History',
    favorites: 'Favorites',
    emptyHistory: 'No past analyses found.',
    savedAt: 'Saved at',
    view: 'View Result',
    delete: 'Delete'
  },
  ar: {
    title: 'مُراجع الكود المحترف',
    subtitle: 'نظام الأداء الفائق والنمو الذكي',
    upload: 'رفع الملفات',
    explain: 'شرح الكود',
    growth: 'اقتراح تطوير',
    review: 'مراجعة الكود',
    security: 'الأمان',
    performance: 'تحسين الأداء',
    consult: 'مستشار الذكاء الاصطناعي',
    original: 'الكود الأصلي',
    fixed: 'النسخة المصححة ✨',
    reset: 'إعادة تعيين',
    placeholder: 'أدخل الكود هنا أو اسحب الملفات...',
    dropFiles: 'أفلت الملفات أو المجلد هنا...',
    analyzing: 'جاري التحليل العميق...',
    ready: 'جاهز للتحليل',
    readySub: 'قم بإجراء مراجعة للأخطاء، أو اختبار أمان، أو تحسين أداء الخوارزميات.',
    architecture: 'المعمارية',
    techStack: 'مجموعة التقنيات',
    roadmap: 'خارطة الطريق 🚀',
    healthScore: 'درجة جودة الكود',
    securityScore: 'درجة الأمان',
    perfScore: 'درجة الأداء',
    applyFixes: 'تطبيق الإصلاحات',
    vision: 'رؤية المنتج',
    impact: 'التأثير',
    dev: 'الصعوبة',
    reasoning: 'المنطق التجاري',
    implementation: 'كود التنفيذ المقترح',
    footer: 'محرك FAANG الذكي • وحدة تحسين الأداء نشطة',
    chatPlaceholder: 'اسأل عن التعقيد، الذاكرة...',
    send: 'إرسال',
    aiTyping: 'المستشار يفكر...',
    consultWelcome: 'أهلاً بك! أنا مهندسك الخبير. اسألني أي شيء حول الخوارزميات أو تحسين الأنظمة.',
    clearChat: 'مسح السجل',
    vulnerabilities: 'الثغرات الأمنية',
    dataSensitivity: 'حساسية البيانات',
    compliance: 'الامتثال والمعايير',
    riskCritical: 'خطر حرج',
    riskHigh: 'خطر عالٍ',
    riskMedium: 'خطر متوسط',
    riskLow: 'خطر منخفض',
    bottlenecks: 'اختناقات الأداء',
    resourceUsage: 'تحليل استهلاك الموارد',
    scalability: 'قرار قابلية التوسع',
    complexity: 'تعقيد الخوارزمية (Big O)',
    darkMode: 'الوضع الداكن',
    lightMode: 'الوضع الفاتح',
    healthProfile: 'ملف صحة الكود',
    issueDistribution: 'توزيع المشاكل',
    stepReading: 'جاري قراءة ملفات المصدر...',
    stepThinking: 'ذكاء Gemini يحلل المنطق...',
    stepStructuring: 'جاري بناء التقرير النهائي...',
    filesUploaded: 'ملفات مرفوعة',
    noFiles: 'لا توجد ملفات مرفوعة حالياً',
    history: 'السجل',
    favorites: 'المفضلة',
    emptyHistory: 'لا توجد تحليلات سابقة.',
    savedAt: 'حُفظ في',
    view: 'عرض النتيجة',
    delete: 'حذف'
  }
};

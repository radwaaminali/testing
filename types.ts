
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
    subtitle: 'Growth & Refactor Pipeline',
    upload: 'Upload Files',
    explain: 'Explain',
    growth: 'Growth',
    review: 'Review',
    consult: 'AI Consultant',
    original: 'Original',
    fixed: 'Fixed Version ✨',
    reset: 'Reset',
    placeholder: 'Paste code here or upload files...',
    analyzing: 'Analyzing Structure...',
    ready: 'Ready for Analysis',
    readySub: 'Run a Review to find bugs, Explain to understand, or Chat with the Consultant.',
    architecture: 'Architecture',
    roadmap: 'Roadmap 🚀',
    healthScore: 'Health Score',
    applyFixes: 'Apply Fixes',
    vision: 'Product Vision',
    impact: 'Impact',
    dev: 'Dev',
    reasoning: 'Business Reasoning',
    implementation: 'Implementation Code',
    footer: 'FAANG AI Engine • Product Growth Strategist Active',
    logicFlow: 'Logic Flow',
    keyModules: 'Key Modules',
    techStack: 'Tech Stack',
    chatPlaceholder: 'Ask about scaling, bugs, or logic...',
    send: 'Send',
    aiTyping: 'Consultant is thinking...',
    consultWelcome: 'Hello! I am your Senior Staff Engineer. Ask me anything about this project.',
    clearChat: 'Clear History'
  },
  ar: {
    title: 'مُراجع الكود المحترف',
    subtitle: 'نظام التطوير وإعادة الهيكلة الذكي',
    upload: 'رفع الملفات',
    explain: 'شرح الكود',
    growth: 'اقتراح تطوير',
    review: 'مراجعة الكود',
    consult: 'مستشار الذكاء الاصطناعي',
    original: 'الكود الأصلي',
    fixed: 'النسخة المصححة ✨',
    reset: 'إعادة تعيين',
    placeholder: 'أدخل الكود هنا أو قم برفع ملفات المشروع...',
    analyzing: 'جاري تحليل الهيكل...',
    ready: 'جاهز للتحليل',
    readySub: 'قم بإجراء مراجعة للبحث عن الأخطاء، أو اطلب شرحاً لفهم المعمارية، أو دردش مع المستشار الذكي.',
    architecture: 'المعمارية',
    roadmap: 'خارطة الطريق 🚀',
    healthScore: 'درجة جودة الكود',
    applyFixes: 'تطبيق الإصلاحات',
    vision: 'رؤية المنتج',
    impact: 'التأثير',
    dev: 'الصعوبة',
    reasoning: 'المنطق التجاري',
    implementation: 'كود التنفيذ المقترح',
    footer: 'محرك FAANG الذكي • خبير استراتيجيات النمو نشط حالياً',
    logicFlow: 'مسار المنطق',
    keyModules: 'الوحدات الأساسية',
    techStack: 'التقنيات المستخدمة',
    chatPlaceholder: 'اسأل عن قابلية التوسع، الأخطاء، أو منطق الكود...',
    send: 'إرسال',
    aiTyping: 'المستشار يفكر...',
    consultWelcome: 'أهلاً بك! أنا مهندسك الخبير. اسألني أي شيء حول هذا المشروع.',
    clearChat: 'مسح السجل'
  }
};

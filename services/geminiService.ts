
import { GoogleGenAI, Type } from "@google/genai";
import { CodeReviewResult, SupportedLanguage, ProjectFile, ProjectExplanation, ProjectDevelopmentResult, UILanguage, SecurityAuditResult, PerformanceOptimizationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getLanguageInstruction = (uiLang: UILanguage) => {
  return uiLang === 'ar' ? 'IMPORTANT: Respond ONLY in Arabic.' : 'Respond in English.';
};

export const getPerformanceOptimization = async (
  input: string | ProjectFile[],
  language: SupportedLanguage,
  uiLang: UILanguage = 'en'
): Promise<PerformanceOptimizationResult> => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      performanceScore: { type: Type.NUMBER },
      bottlenecks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            area: { type: Type.STRING, enum: ["Memory", "CPU", "Network", "Database", "Bundle Size"] },
            impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            complexity: { type: Type.STRING },
            bottleneck: { type: Type.STRING },
            optimization: { type: Type.STRING },
            optimizedCode: { type: Type.STRING }
          },
          required: ["area", "impact", "complexity", "bottleneck", "optimization", "optimizedCode"]
        }
      },
      resourceAnalysis: { type: Type.STRING },
      scalabilityVerdict: { type: Type.STRING }
    },
    required: ["performanceScore", "bottlenecks", "resourceAnalysis", "scalabilityVerdict"]
  };

  const systemInstruction = `
    You are a Senior Performance Engineer at a FAANG company. 
    Analyze the provided codebase for performance bottlenecks.
    Focus on:
    1. Algorithmic Complexity (Big O notation).
    2. Memory consumption and leaks.
    3. Execution speed and CPU cycles.
    4. Database query efficiency or Network overhead where applicable.
    Provide optimized code snippets for each major bottleneck.
    Return the result in JSON format.
    ${getLanguageInstruction(uiLang)}
  `;

  let prompt = typeof input === 'string' ? `Code for Performance Optimization:\n${input}` : `Project for Performance Optimization:\n${input.map(f => `${f.path}:\n${f.content}`).join('\n\n')}`;

  const result = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 20000 }
    }
  });

  return JSON.parse(result.text || "{}");
};

export const getSecurityAudit = async (
  input: string | ProjectFile[],
  language: SupportedLanguage,
  uiLang: UILanguage = 'en'
): Promise<SecurityAuditResult> => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      securityScore: { type: Type.NUMBER },
      vulnerabilities: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["Critical", "High", "Medium", "Low"] },
            cwe: { type: Type.STRING },
            description: { type: Type.STRING },
            attackVector: { type: Type.STRING },
            mitigation: { type: Type.STRING }
          },
          required: ["type", "severity", "description", "mitigation"]
        }
      },
      dataSensitivityAnalysis: { type: Type.STRING },
      complianceSummary: { type: Type.STRING }
    },
    required: ["securityScore", "vulnerabilities", "dataSensitivityAnalysis", "complianceSummary"]
  };

  const systemInstruction = `
    You are a Senior Cyber Security Researcher and Penetration Tester. 
    Analyze the provided codebase for vulnerabilities including OWASP Top 10 (SQLi, XSS, CSRF, etc.).
    Identify hardcoded secrets, weak encryption, and improper access controls.
    Perform a data sensitivity analysis.
    Return the result in JSON format.
    ${getLanguageInstruction(uiLang)}
  `;

  let prompt = typeof input === 'string' ? `Code for Security Audit:\n${input}` : `Project for Security Audit:\n${input.map(f => `${f.path}:\n${f.content}`).join('\n\n')}`;

  const result = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 20000 }
    }
  });

  return JSON.parse(result.text || "{}");
};

export const getCodeReview = async (
  input: string | ProjectFile[], 
  language: SupportedLanguage,
  uiLang: UILanguage = 'en'
): Promise<CodeReviewResult> => {
  const categorySchema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER },
      summary: { type: Type.STRING },
      findings: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            lineReference: { type: Type.STRING },
            issue: { type: Type.STRING },
            description: { type: Type.STRING },
            suggestedFix: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["Critical", "Warning", "Suggestion"] }
          },
          required: ["issue", "description", "suggestedFix", "severity"]
        }
      }
    },
    required: ["score", "summary", "findings"]
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      overallScore: { type: Type.NUMBER },
      executiveSummary: { type: Type.STRING },
      categories: {
        type: Type.OBJECT,
        properties: {
          security: categorySchema,
          bugs: categorySchema,
          performance: categorySchema,
          quality: categorySchema,
          maintainability: categorySchema
        },
        required: ["security", "bugs", "performance", "quality", "maintainability"]
      }
    },
    required: ["overallScore", "executiveSummary", "categories"]
  };

  const systemInstruction = `You are a Senior Staff Software Engineer at a FAANG company. Analyze code and provide a JSON review. ${getLanguageInstruction(uiLang)}`;
  let prompt = typeof input === 'string' ? `Code:\n${input}` : `Project Files:\n${input.map(f => `${f.path}:\n${f.content}`).join('\n\n')}`;

  const result = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 15000 }
    }
  });
  return JSON.parse(result.text || "{}");
};

export const explainProject = async (
  input: string | ProjectFile[],
  language: SupportedLanguage,
  uiLang: UILanguage = 'en'
): Promise<ProjectExplanation> => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      briefSummary: { type: Type.STRING },
      techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
      architecturePattern: { type: Type.STRING },
      coreLogicFlow: { type: Type.STRING },
      keyModules: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            responsibility: { type: Type.STRING }
          },
          required: ["name", "responsibility"]
        }
      }
    },
    required: ["title", "briefSummary", "techStack", "architecturePattern", "coreLogicFlow", "keyModules"]
  };

  const systemInstruction = `You are a CTO explaining a codebase. Identify hidden patterns. Return JSON. ${getLanguageInstruction(uiLang)}`;
  let prompt = typeof input === 'string' ? `Code:\n${input}` : `Project:\n${input.map(f => f.path).join(', ')}\n\nContent:\n${input.map(f => f.content).join('\n')}`;

  const result = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 10000 }
    }
  });
  return JSON.parse(result.text || "{}");
};

export const suggestDevelopment = async (
  input: string | ProjectFile[],
  language: SupportedLanguage,
  uiLang: UILanguage = 'en'
): Promise<ProjectDevelopmentResult> => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      visionStatement: { type: Type.STRING },
      suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ["Feature", "Scalability", "UX", "Architecture", "DX"] },
            title: { type: Type.STRING },
            impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            complexity: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
            description: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            suggestedCode: { type: Type.STRING, description: "A snippet of code illustrating how to implement this suggestion." }
          },
          required: ["category", "title", "impact", "complexity", "description", "reasoning", "suggestedCode"]
        }
      }
    },
    required: ["visionStatement", "suggestions"]
  };

  const systemInstruction = `
    You are a Product Manager and a Principal Engineer at a top tech firm. 
    Analyze the project and suggest strategic improvements.
    For each suggestion, provide a concrete code snippet (suggestedCode) that demonstrates the implementation logic.
    ${getLanguageInstruction(uiLang)}
  `;

  let prompt = typeof input === 'string' ? `Project:\n${input}` : `Project context:\n${input.map(f => f.path).join(', ')}\n\nFiles:\n${input.map(f => f.content).join('\n')}`;

  const result = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 15000 }
    }
  });

  return JSON.parse(result.text || "{}");
};

export const applyFixes = async (
  input: string | ProjectFile[],
  review: CodeReviewResult,
  language: SupportedLanguage
): Promise<string | ProjectFile[]> => {
  const responseSchema = typeof input === 'string' ? {
    type: Type.OBJECT,
    properties: { fixedCode: { type: Type.STRING } },
    required: ["fixedCode"]
  } : {
    type: Type.OBJECT,
    properties: {
      fixedFiles: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { path: { type: Type.STRING }, content: { type: Type.STRING } },
          required: ["path", "content"]
        }
      }
    },
    required: ["fixedFiles"]
  };

  const systemInstruction = `Refactor the code based on the review. Maintain style. Minimal changes. Keep code in original programming language.`;
  let prompt = `Review: ${JSON.stringify(review)}\n\nCode:\n`;
  if (typeof input === 'string') prompt += input;
  else input.forEach(f => prompt += `FILE: ${f.path}\n${f.content}\n`);

  const result = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 15000 }
    }
  });

  const parsed = JSON.parse(result.text || "{}");
  return typeof input === 'string' ? parsed.fixedCode : parsed.fixedFiles;
};

// New Chat Functionality
export const getChatConsultation = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string,
  projectContext: string,
  uiLang: UILanguage
) => {
  const systemInstruction = `You are a Senior Staff Engineer Consultant. 
  You are discussing this project:
  ${projectContext}
  
  Provide brief, technical, and high-value advice. Be direct. 
  ${getLanguageInstruction(uiLang)}`;

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
      temperature: 0.7
    },
    history: history
  });

  const response = await chat.sendMessage({ message: newMessage });
  return response.text;
};

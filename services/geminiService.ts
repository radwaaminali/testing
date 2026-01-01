
import { GoogleGenAI, Type } from "@google/genai";
import { CodeReviewResult, SupportedLanguage, ProjectFile, ProjectExplanation, ProjectDevelopmentResult, UILanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getLanguageInstruction = (uiLang: UILanguage) => {
  return uiLang === 'ar' ? 'IMPORTANT: Respond ONLY in Arabic.' : 'Respond in English.';
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

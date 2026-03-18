
import { GoogleGenAI, Type } from "@google/genai";
import { WorkshopLog, LogType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractLogFromAudio = async (
  base64Audio: string, 
  mimeType: string, 
  type: LogType
): Promise<Partial<WorkshopLog>> => {
  const model = "gemini-3-flash-preview";
  
  const typePrompts = {
    session: "Transcribe a workshop/studio session log for an existing or untitled project. Focus on highlights, breakthrough points, technical hurdles, and general session flow.",
    idea: "Transcribe a 'New Idea Ramble'. The user is seeding a new thought. Extract the core concept, potential medium, and any immediate inspirations mentioned.",
    brainstorm: "Transcribe a 'Brainstorming Session'. The user is either refining an existing idea or expanding on a new one. Focus on extracting multiple divergent paths, creative 'what-ifs', and key pivots mentioned.",
    problem: "Transcribe a problem-solving session. Focus on the specific hurdle and any solutions or experiments discussed.",
    post: "Transcribe a word-vomit brainstorm for a social media post. Structure it with a catchy 'hook', a well-formatted 'caption' summary, and a 'body' text. Make it engaging for an audience."
  };

  const systemInstruction = `
    Analyze the provided audio recording. 
    ${typePrompts[type]}
    Extract key information into the specified JSON format.
    If any field is unknown or not mentioned, return null.
    Important: Extract the 'duration_minutes' as the INTENDED or GOAL duration mentioned by the user in the audio.
    The primary project name is crucial.
    
    TONE AND STYLE:
    - Use the user's actual words and specific vocabulary as much as possible.
    - Mirror their unique phrasing and artistic terminology.
    - Don't be overly formal or professional. Keep it feeling like a personal studio note written by the user themselves.
    - Capture the user's natural energy and specific linguistic quirks.
    - Still provide clean text by removing excessive stammers, but preserve the exact "flavor" and "keywords" of their speech.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Audio, mimeType } },
        { text: `Extract details for a ${type} log from this recording.` }
      ]
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          project_name: { type: Type.STRING },
          date: { type: Type.STRING, description: "ISO date string" },
          duration_minutes: { type: Type.NUMBER, description: "The goal duration mentioned in the audio" },
          summary: { type: Type.STRING, description: "Used for ideas and brainstorms" },
          how_it_went: { type: Type.STRING, description: "Overall sentiment and flow of the session" },
          general_thoughts: { type: Type.STRING, description: "Miscellaneous reflections or tangential ideas" },
          problem: { type: Type.STRING, description: "Used for problem solving" },
          solution: { type: Type.STRING, description: "Used for problem solving" },
          post_hook: { type: Type.STRING, description: "Catchy opening line for a post" },
          post_caption: { type: Type.STRING, description: "The summarized engaging caption" },
          post_body: { type: Type.STRING, description: "Main content of the post" },
          materials_used: { type: Type.ARRAY, items: { type: Type.STRING } },
          stage: { type: Type.STRING, enum: ["ideation", "experimenting", "production", "finished"] },
          challenges: { type: Type.STRING, description: "Lowlights or blocks" },
          wins: { type: Type.STRING, description: "Highlights or breakthroughs" },
          mood: { type: Type.STRING },
          energy_level: { type: Type.INTEGER },
          next_steps: { type: Type.STRING },
          raw_transcript: { type: Type.STRING }
        },
        required: ["project_name", "date", "raw_transcript"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return { ...data, type };
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Could not extract structured data.");
  }
};

export const processDeepDiveResponse = async (
  input: string | { base64: string, minType: string },
  question: string
): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `
    You are a studio assistant. The user is answering a deep-dive question: "${question}".
    Transcribe their response if it's audio, or clean it up if it's text.
    Return ONLY the structured, refined answer to that specific question. 
    
    TONE AND STYLE:
    - Use the user's actual words and specific vocabulary as much as possible.
    - Mirror their unique phrasing and artistic terminology.
    - Capture the creative "vibe" and specific artistic details using the user's own descriptors.
    - Avoid being overly clinical or professional.
    - No conversational filler from you.
  `;

  const parts = typeof input === 'string' 
    ? [{ text: input }]
    : [{ inlineData: { data: input.base64, mimeType: input.minType } }];

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: { systemInstruction }
  });

  return response.text.trim();
};

export const refineNarrativeFromAudio = async (
  base64Audio: string,
  mimeType: string,
  currentDescription?: string
): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `
    You are a creative's archival assistant. 
    Transcribe the provided audio and merge it with the existing project description if provided.
    
    CRITICAL RULES:
    1. Capture the user's natural, casual tone. Use their actual words and phrasing.
    2. Extract the meaningful artistic intent and project updates using the user's specific vocabulary.
    3. Keep it feeling like a living project note—raw, authentic, and vibe-heavy.
    4. Do NOT include any preamble or meta-talk.
    5. Return ONLY the refined project description text.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Audio, mimeType } },
        { text: `Refine this project description. ${currentDescription ? `Existing Context: "${currentDescription}"` : ''}` }
      ]
    },
    config: {
      systemInstruction,
      temperature: 0.4,
    }
  });

  return response.text.trim() || "No description extracted.";
};

export const summarizeSeed = async (base64Audio: string, mimeType: string): Promise<string | null> => {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `
    You are a flow-state companion.
    Listen to this 10-second snippet of an artist working. 
    If there is speech, extract the most potent 2-4 words directly from the user's speech.
    Prioritize using the user's actual vocabulary and phrasing over your own interpretation.
    The goal is to mirror their exact "thought seed" as they spoke it.
    If there is only background noise or silence, return 'SILENCE'.
    Return ONLY the summary text or 'SILENCE'.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Audio, mimeType } },
        { text: "Summarize this snippet." }
      ]
    },
    config: { systemInstruction, temperature: 0.1 }
  });

  const text = response.text.trim();
  return text === 'SILENCE' ? null : text;
};

export const reprocessTranscript = async (
  transcript: string,
  type: LogType
): Promise<Partial<WorkshopLog>> => {
  const model = "gemini-3-flash-preview";
  
  const typePrompts = {
    session: "Re-analyze this studio session transcript. Focus on extracting clearer highlights, breakthrough points, technical hurdles, and session flow.",
    idea: "Re-analyze this 'New Idea Ramble' transcript. Extract the core concept, potential medium, and inspirations more clearly.",
    brainstorm: "Re-analyze this 'Brainstorming Session' transcript. Focus on extracting divergent paths, creative 'what-ifs', and key pivots.",
    problem: "Re-analyze this problem-solving session transcript. Focus on the specific hurdle and any solutions discussed.",
    post: "Re-analyze this social media brainstorm transcript. Structure it with a catchy 'hook', a well-formatted 'caption', and a 'body' text."
  };

  const systemInstruction = `
    Analyze the provided transcript. 
    ${typePrompts[type]}
    Extract key information into the specified JSON format.
    If any field is unknown or not mentioned, return null.
    
    TONE AND STYLE:
    - Use the user's actual words and specific vocabulary as much as possible.
    - Mirror their unique phrasing and artistic terminology.
    - Don't be overly formal. Keep it feeling like a personal studio note.
    - Capture the user's natural energy and specific linguistic quirks.
    - Provide clean text by removing excessive stammers, but preserve the exact "flavor" and "keywords" of their speech.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { text: `Reprocess this transcript for a ${type} log: "${transcript}"` }
      ]
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          project_name: { type: Type.STRING },
          duration_minutes: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          how_it_went: { type: Type.STRING },
          general_thoughts: { type: Type.STRING },
          problem: { type: Type.STRING },
          solution: { type: Type.STRING },
          post_hook: { type: Type.STRING },
          post_caption: { type: Type.STRING },
          post_body: { type: Type.STRING },
          materials_used: { type: Type.ARRAY, items: { type: Type.STRING } },
          stage: { type: Type.STRING, enum: ["ideation", "experimenting", "production", "finished"] },
          challenges: { type: Type.STRING },
          wins: { type: Type.STRING },
          mood: { type: Type.STRING },
          energy_level: { type: Type.INTEGER },
          next_steps: { type: Type.STRING }
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return data;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Could not reprocess transcript.");
  }
};

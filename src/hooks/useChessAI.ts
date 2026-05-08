import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export function useChessAI() {
  const getHint = async (fen: string) => {
    try {
      const ai = getGenAI();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          systemInstruction: "You are a chess grandmaster. Provide a single, concise, human-readable tip for the current position. Maximum 10 words. No technical jargon."
        },
        contents: [{ 
          role: 'user', 
          parts: [{ text: `Provide a hint for this chess position: FEN: ${fen}` }] 
        }]
      });
      
      return response.text || "No strategy found.";
    } catch (error) {
       console.error("AI HINT ERROR:", error);
       return "DATA CORRUPTION: ADVISOR OFFLINE";
    }
  };

  return { getHint };
}

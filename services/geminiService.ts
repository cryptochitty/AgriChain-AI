
import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this project, we'll alert and assume the key is set in the environment.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generatePlan = async (userInput: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are the Planner Agent for AgriChain AI, a sophisticated agricultural monitoring system. A user has made a request to analyze their farm. Your job is to break down this request into a clear, ordered list of high-level tasks for the other agents to execute.

        The user's request is: "${userInput}"

        Based on this, generate a list of tasks. The tasks should follow this general sequence:
        1. Fetch relevant data (weather, soil, satellite imagery/NDVI).
        2. Analyze the collected data for patterns and insights.
        3. Detect specific risks like pests or diseases.
        
        Keep the task descriptions concise and actionable.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "A single, actionable task for the AgriChain AI system."
              }
            }
          }
        },
      },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    if (parsed && Array.isArray(parsed.tasks)) {
      return parsed.tasks;
    }

    throw new Error("Invalid response format from Gemini API");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Fallback to a predefined plan if API fails
    return [
      `Fetch weather data for ${userInput.split(' in ')[1] || 'the area'}`,
      "Fetch local soil and NDVI data",
      "Analyze weather and soil patterns",
      "Detect pest and disease risks",
      "Generate final farm condition report"
    ];
  }
};

import { GoogleGenAI, Type } from "@google/genai";
import { VisualizationConfig, ChartType } from "../types";

// Helper to get API key securely
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeImageAndData = async (
  imageDataBase64: string | null,
  dataSample: any[],
  columns: string[],
  userPrompt: string
): Promise<VisualizationConfig> => {
  const ai = getAiClient();
  
  const prompt = `
    You are an expert Data Visualization Engineer. 
    
    Task:
    1. Analyze the provided dataset structure (columns and sample data).
    2. If an image is provided, analyze the chart style, type, and aesthetics (color, layout) from the image.
    3. Generate a configuration to recreate a similar visualization using the provided dataset.
    4. If no image is provided, suggest the best chart type based on the data and user prompt.
    5. Also generate R (ggplot2) and Python (matplotlib/seaborn) code snippets to reproduce this chart.

    User Prompt: ${userPrompt}
    Data Columns: ${JSON.stringify(columns)}
    Data Sample (First 3 rows): ${JSON.stringify(dataSample.slice(0, 3))}
  `;

  const parts: any[] = [{ text: prompt }];

  if (imageDataBase64) {
    // Remove header if present (e.g., "data:image/png;base64,")
    const cleanBase64 = imageDataBase64.split(',')[1] || imageDataBase64;
    parts.push({
      inlineData: {
        mimeType: 'image/png', // Assuming PNG for simplicity, could be dynamic
        data: cleanBase64
      }
    });
  }

  // Schema for structured output
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: parts
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chartType: { type: Type.STRING, enum: Object.values(ChartType) },
          xAxisKey: { type: Type.STRING, description: "Key from data to use for X axis" },
          yAxisKey: { type: Type.STRING, description: "Key from data to use for Y axis (primary metric)" },
          seriesKeys: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of keys for multiple lines/bars if applicable" },
          groupBy: { type: Type.STRING, description: "Key to group by for colors (e.g., 'Pclass' or 'Sex')" },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          xLabel: { type: Type.STRING },
          yLabel: { type: Type.STRING },
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          rCode: { type: Type.STRING, description: "Complete R script using ggplot2" },
          pythonCode: { type: Type.STRING, description: "Complete Python script using seaborn/matplotlib" }
        },
        required: ["chartType", "xAxisKey", "yAxisKey", "title", "rCode", "pythonCode"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as VisualizationConfig;
};

export const refineConfig = async (
  currentConfig: VisualizationConfig,
  userPrompt: string
): Promise<VisualizationConfig> => {
  const ai = getAiClient();

  const prompt = `
    Current Configuration: ${JSON.stringify(currentConfig)}
    User Update Request: "${userPrompt}"

    Update the visualization configuration based on the user's request. 
    You can change the chart type, axis keys, titles, or colors.
    Regenerate the R and Python code to reflect these changes.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chartType: { type: Type.STRING, enum: Object.values(ChartType) },
          xAxisKey: { type: Type.STRING },
          yAxisKey: { type: Type.STRING },
          seriesKeys: { type: Type.ARRAY, items: { type: Type.STRING } },
          groupBy: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          xLabel: { type: Type.STRING },
          yLabel: { type: Type.STRING },
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          rCode: { type: Type.STRING },
          pythonCode: { type: Type.STRING }
        },
        required: ["chartType", "xAxisKey", "yAxisKey", "title", "rCode", "pythonCode"]
      }
    }
  });

   if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as VisualizationConfig;
};
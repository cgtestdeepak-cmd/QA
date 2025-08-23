import { GoogleGenAI, Type } from "@google/genai";
import { TestCase } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using a placeholder. The app will not function correctly without a valid API key.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "YOUR_API_KEY_HERE" });

const testCaseSchema = {
  type: Type.OBJECT,
  properties: {
    testCaseId: { type: Type.STRING, description: "A unique identifier, e.g., TC-001." },
    testScenario: { type: Type.STRING, description: "High-level description of what is being tested." },
    preConditions: { type: Type.STRING, description: "What must be true before the test can be executed. Can be 'N/A'." },
    testSteps: { type: Type.STRING, description: "A newline-separated list of actions to perform." },
    testData: { type: Type.STRING, description: "Specific data values to use for the test. Can be 'N/A'." },
    expectedResult: { type: Type.STRING, description: "The expected outcome after executing the test steps." },
    priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "Priority of the test case." },
    type: { type: Type.STRING, enum: ['Positive', 'Negative', 'Edge'], description: "Type of test case." },
  },
};

const responseSchema = {
  type: Type.ARRAY,
  items: testCaseSchema,
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const createPrompt = (prdText: string, figmaLink: string, imageProvided: boolean): string => {
  const imageInstruction = imageProvided
    ? `**3. Uploaded Image (for UI/UX and functional reference):**
An image has been provided. Analyze it in conjunction with the PRD and Figma link to understand the UI, layout, and functionality.`
    : "";

  return `
You are an exceptionally meticulous and detail-oriented Senior QA Engineer. Your primary directive is to create the most exhaustive and comprehensive test suite possible from the provided materials.

**Your Mission:**
Scrutinize every line, word, and detail of the provided inputs to identify every possible test scenario. Your goal is to maximize the number of high-quality, relevant test cases to ensure zero defects escape to production.

**Analyze the following inputs with extreme care:**

**1. Product Requirements Document (PRD) Content:**
---
${prdText}
---

**2. Figma Design Link (for UI/UX reference):**
${figmaLink || "No Figma link provided. Focus solely on the PRD's functional requirements."}

${imageInstruction}

**Your Task:**
1.  **Read Carefully:** Perform a line-by-line analysis of the PRD. Extract every explicit and implicit requirement, user flow, and constraint.
2.  **Generate Exhaustively:** Create a comprehensive list of functional test cases that covers every single feature mentioned. Think about all possible user interactions.
3.  **Categorize Thoroughly:** For each feature, generate a full spectrum of tests:
    *   **Positive Test Cases:** Verify the functionality works as expected with valid inputs.
    *   **Negative Test Cases:** Verify the system handles invalid inputs and error conditions gracefully.
    *   **Edge/Boundary Cases:** Test the limits and boundaries of input fields and system constraints.
4.  **Be Specific:** For each test case, you must provide all the fields defined in the schema. 'Test Steps' must be a clear, precise, and easy-to-follow sequence of actions, separated by newlines. 'Expected Result' must be unambiguous.
5.  **Ensure Uniqueness:** The 'Test Case ID' for each case must be unique (e.g., TC-FUNC-001, TC-ERR-001).

Return the output as a JSON array of objects, strictly conforming to the provided JSON schema. Do not include any additional text, explanations, or markdown formatting outside of the JSON array. Your response should be nothing but the JSON.
  `;
};

export const generateTestCases = async (prdText: string, figmaLink: string, imageFile: File | null): Promise<TestCase[]> => {
  if (!prdText.trim()) {
    throw new Error("PRD content cannot be empty.");
  }

  const prompt = createPrompt(prdText, figmaLink, !!imageFile);
  
  const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [
    { text: prompt }
  ];

  if (imageFile) {
    if (imageFile.size > 4 * 1024 * 1024) { // 4MB limit for inline data
        throw new Error("Image file size exceeds the 4MB limit. Please upload a smaller image.");
    }
    const imagePart = await fileToGenerativePart(imageFile);
    parts.push(imagePart);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error("Received an empty response from the AI. The model may have refused to answer.");
    }

    const parsedJson = JSON.parse(responseText);
    return parsedJson as TestCase[];

  } catch (error) {
    console.error("Error generating test cases:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("The configured API key is invalid. Please check your environment variables.");
    }
    throw new Error("Failed to generate test cases. Please check the console for details.");
  }
};
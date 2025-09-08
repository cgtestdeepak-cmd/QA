import { GoogleGenAI, Type } from "@google/genai";
import { TestCase } from '../types';

let aiInstance: GoogleGenAI | null = null;

// Lazily initialize the AI instance to handle the API key check gracefully.
function getAiInstance() {
    if (aiInstance) {
        return aiInstance;
    }
    
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        // This error is caught by the handleGenerate function in App.tsx and displayed in the UI.
        throw new Error("API_KEY is not configured. Please set the API_KEY environment variable in your hosting provider's settings.");
    }

    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
}

const testCaseProperties = {
    testCaseId: { type: Type.STRING, description: "A unique identifier in the format TC_XXX, e.g., TC_001." },
    testScenario: { type: Type.STRING, description: "High-level description of what is being tested." },
    preConditions: { type: Type.STRING, description: "What must be true before the test can be executed. Can be 'N/A'." },
    testSteps: { type: Type.STRING, description: "A newline-separated list of actions to perform." },
    testData: { type: Type.STRING, description: "Specific data values to use for the test. Can be 'N/A'." },
    expectedResult: { type: Type.STRING, description: "The expected outcome after executing the test steps." },
    priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "Priority of the test case." },
    type: { type: Type.STRING, enum: ['Positive', 'Negative', 'Edge'], description: "Type of test case." },
    domain: { type: Type.STRING, enum: ['Functional', 'UI/UX'], description: "The domain of the test case." },
    suiteType: { type: Type.STRING, enum: ['Smoke', 'Sanity', 'Regression'], description: "The test suite this case belongs to." },
};

const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: testCaseProperties,
        required: Object.keys(testCaseProperties),
    }
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
  const prdSection = prdText 
    ? `**1. Product Requirements Document (PRD) Content:**\n\`\`\`\n${prdText}\n\`\`\`` 
    : "**1. Product Requirements Document (PRD) Content:**\nNot provided.";

  const figmaSection = figmaLink 
    ? `**2. Figma Design Link (for UI/UX reference):**\n${figmaLink}` 
    : "**2. Figma Design Link (for UI/UX reference):**\nNot provided.";

  const imageSection = imageProvided
    ? `**3. Uploaded Image (for UI/UX and functional reference):**
An image has been provided. Analyze it in conjunction with other provided materials to understand the UI, layout, and functionality.`
    : "**3. Uploaded Image (for UI/UX and functional reference):**\nNot provided.";

  return `
You are an exceptionally meticulous and detail-oriented Senior QA Engineer. Your primary directive is to create the most exhaustive and comprehensive test suite possible from the provided materials.

**Your Mission:**
Scrutinize every line, word, and detail of the provided inputs to identify every possible test scenario. Your goal is to maximize the number of high-quality, relevant test cases to ensure zero defects escape to production.

**Analyze the following inputs with extreme care. Generate test cases based on the information that has been provided:**

${prdSection}

${figmaSection}

${imageSection}

**Your Task:**
1.  **Read Carefully:** Perform a line-by-line analysis of the provided materials. Extract every explicit and implicit requirement, user flow, and constraint from the available inputs.
2.  **Generate Exhaustively:** Create a comprehensive list of functional and UI/UX test cases that covers every single feature mentioned or inferred. Think about all possible user interactions.
3.  **Categorize by Type:** For each feature, generate a full spectrum of tests:
    *   **Positive Test Cases:** Verify the functionality works as expected with valid inputs.
    *   **Negative Test Cases:** Verify the system handles invalid inputs and error conditions gracefully.
    *   **Edge/Boundary Cases:** Test the limits and boundaries of input fields and system constraints.
4.  **Categorize by Domain:** Classify each test case into one of two domains:
    *   **Functional:** Focuses on the underlying logic, business rules, calculations, and functionality described in the PRD. (e.g., "Verify user login with correct credentials").
    *   **UI/UX:** Focuses on visual elements, layout, responsiveness, and user interaction based on the Figma design or image. (e.g., "Verify the login button is blue and in the top-right corner").
5.  **Categorize by Suite Type:** Assign each test case to a test suite type:
    *   **Smoke:** Critical, high-level tests that ensure the main functionalities work. These are the most important tests.
    *   **Sanity:** Tests that focus on a specific, recently changed, or new area of functionality to ensure it works as expected.
    *   **Regression:** Comprehensive tests covering existing features to ensure they were not broken by new changes. Most test cases will fall into this category.
6.  **Be Specific:** For each test case, you must provide all the fields defined in the schema, including 'domain' and 'suiteType'. 'Test Steps' must be a clear, precise, and easy-to-follow sequence of actions, separated by newlines. 'Expected Result' must be unambiguous.
7.  **Ensure Uniqueness:** The 'testCaseId' for each case must be a simple, unique identifier following the format 'TC_XXX', starting from 'TC_001' and incrementing for each subsequent test case (e.g., TC_001, TC_002, TC_003).

**Crucial Formatting Rule:** When generating string values for any JSON field, you MUST properly escape all double quotes (") with a backslash (e.g., "The user sees a message saying \\"Success!\\"."). This is absolutely critical for the output to be valid JSON.

Return the output as a JSON array of objects, strictly conforming to the provided JSON schema. Do not include any additional text, explanations, or markdown formatting outside of the JSON array. Your response must be only the raw JSON.
  `;
};

/**
 * A robust JSON parser that attempts to fix common issues from LLM outputs,
 * such as trailing commas or truncated responses.
 * @param jsonString The raw string response from the model.
 * @returns An array of TestCase objects.
 */
function robustJsonParse(jsonString: string): TestCase[] {
  let text = jsonString.trim();
  // Remove markdown code block fences if they exist.
  if (text.startsWith("```json")) {
    text = text.slice(7);
    if (text.endsWith("```")) {
      text = text.slice(0, -3);
    }
  } else if (text.startsWith("```")) {
    text = text.slice(3);
    if (text.endsWith("```")) {
        text = text.slice(0, -3);
    }
  }
  
  try {
    // First, try a direct parse.
    return JSON.parse(text) as TestCase[];
  } catch (initialError) {
    console.warn("Initial JSON parsing failed. Attempting to repair...", initialError);
    // Attempt to fix a truncated JSON array.
    // This is a common issue when the model's output exceeds the max token limit.
    const lastComma = text.lastIndexOf(',');
    const lastBrace = text.lastIndexOf('}');
    
    if (lastBrace > lastComma) {
      // The string likely ends with a complete object, but the array is not closed.
      text = text.substring(0, lastBrace + 1) + ']';
    } else {
      // The string likely ends mid-object, after a comma.
      text = text.substring(0, lastComma) + ']';
    }

    try {
      const parsedJson = JSON.parse(text);
      console.log("Successfully repaired and parsed truncated JSON.");
      return parsedJson as TestCase[];
    } catch (repairError) {
      console.error("Failed to repair JSON. Raw response:", jsonString);
      throw new Error("The AI returned a malformed response that could not be parsed. Please check the console for the raw output and try simplifying your request.");
    }
  }
}

export const generateTestCases = async (prdText: string, figmaLink: string, imageFile: File | null): Promise<TestCase[]> => {
  const ai = getAiInstance();

  if (!prdText.trim() && !figmaLink.trim() && !imageFile) {
    throw new Error("Please provide at least one input: PRD text, a Figma link, or an image.");
  }
  
  const prompt = createPrompt(prdText, figmaLink, !!imageFile);
  
  const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [
    { text: prompt },
  ];

  if (imageFile) {
    if (imageFile.size > 4 * 1024 * 1024) { // 4MB limit for inline data
        throw new Error("Image file size exceeds the 4MB limit. Please upload a smaller image.");
    }
    const imagePart = await fileToGenerativePart(imageFile);
    parts.push(imagePart);
  }

  let responseText = '';
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
    
    responseText = response.text;

    if (!responseText) {
        throw new Error("Received an empty response from the AI. The model may have refused to answer.");
    }

    const parsedJson = robustJsonParse(responseText);

    // Ensure the output is an array.
    if (!Array.isArray(parsedJson)) {
        throw new Error("The AI response was not a valid JSON array.");
    }

    return parsedJson as TestCase[];

  } catch (error) {
    console.error("Error in generateTestCases:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            throw new Error("The configured API key is invalid. Please check your environment variables.");
        }
        throw error; // Re-throw other errors to be caught by the UI
    }
    throw new Error("An unknown error occurred during test case generation.");
  }
};

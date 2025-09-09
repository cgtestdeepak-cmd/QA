import { GoogleGenAI, Type } from "@google/genai";
import { TestCase } from '../types';

let aiInstance: GoogleGenAI | null = null;

// Lazily initialize the AI instance to handle the API key check gracefully.
// This prevents a top-level error and allows us to show a friendly message in the UI.
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
  },
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

const createPrompt = (prdText: string, figmaLink: string, imageCount: number, focusPrompt: string): string => {
  const prdSection = prdText 
    ? `**1. Product Requirements Document (PRD) Content:**
\`\`\`
${prdText}
\`\`\`` 
    : "**1. Product Requirements Document (PRD) Content:**\nNot provided.";

  const figmaSection = figmaLink 
    ? `**2. Figma Design Link (for UI/UX reference):**\n${figmaLink}` 
    : "**2. Figma Design Link (for UI/UX reference):**\nNot provided.";

  const imageSection = imageCount > 0
    ? `**3. Uploaded Images (${imageCount}) (for UI/UX and functional reference):**
Images have been provided. Analyze them in conjunction with other provided materials to understand the UI, layout, and functionality.`
    : "**3. Uploaded Images (for UI/UX and functional reference):**\nNot provided.";
  
  const focusSection = focusPrompt
    ? `**Primary Focus for this Generation:**
---
${focusPrompt}
---
` : "";
  
  return `
You are an exceptionally meticulous and detail-oriented Senior QA Engineer. Your primary directive is to create the most exhaustive and comprehensive test suite possible from the provided materials.

**Your Mission:**
Scrutinize every line, word, and detail of the provided inputs to identify every possible test scenario. Your goal is to maximize the number of high-quality, relevant test cases to ensure zero defects escape to production.

${focusSection}

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
7.  **Ensure Uniqueness:** The 'Test Case ID' for each case must be a simple, unique identifier following the format 'TC_XXX', starting from 'TC_001' and incrementing for each subsequent test case (e.g., TC_001, TC_002, TC_003). Do not include extra information like domain or type in the ID.

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

  // Remove markdown code block fences
  if (text.startsWith("```json")) {
    text = text.slice(7, text.endsWith("```") ? -3 : undefined).trim();
  } else if (text.startsWith("```")) {
    text = text.slice(3, text.endsWith("```") ? -3 : undefined).trim();
  }

  try {
    return JSON.parse(text) as TestCase[];
  } catch (e) {
    console.warn("Initial JSON parse failed, attempting repair.", e);
  }

  // Find the start of the array. If it doesn't exist, we can't proceed.
  const startIndex = text.indexOf('[');
  if (startIndex === -1) {
    throw new Error("The AI returned a response that does not appear to be a JSON array.");
  }
  
  // Find the end of the last potential object.
  const lastBraceIndex = text.lastIndexOf('}');

  // If there are no objects, we might have an empty or truncated empty array.
  if (lastBraceIndex < startIndex) {
    return []; // Assume empty array for cases like `[` or `[]`.
  }

  // Slice from the start of the array to the end of the last found object.
  let potentialJson = text.substring(startIndex, lastBraceIndex + 1);

  // Close the array.
  potentialJson += ']';
  
  try {
    const parsed = JSON.parse(potentialJson);
    console.log("Successfully repaired and parsed truncated JSON.");
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (repairError) {
    // One last try: what if the model returned something like `[{"a":1}], junk`.
    // The previous attempt would be `[{"a":1}]]` which fails.
    // Let's try parsing just up to the last valid brace.
    const finalAttemptStr = text.substring(startIndex, lastBraceIndex + 1);
    try {
        const parsed = JSON.parse(finalAttemptStr);
        console.log("Successfully repaired by slicing until last brace.");
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (finalError) {
        console.error("Failed to repair JSON after multiple attempts. Raw response:", jsonString, "Last attempt:", potentialJson);
        throw new Error("The AI returned a malformed response that could not be parsed. Please try simplifying your request or regenerating.");
    }
  }
}

export const generateTestCases = async (prdText: string, figmaLink: string, imageFiles: File[], focusPrompt: string): Promise<TestCase[]> => {
  const ai = getAiInstance(); // This will throw an error if the API key is not set.

  if (!prdText.trim() && !figmaLink.trim() && imageFiles.length === 0) {
    throw new Error("Please provide at least one input: PRD text, a Figma link, or an image.");
  }

  const prompt = createPrompt(prdText, figmaLink, imageFiles.length, focusPrompt);
  
  const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [
    { text: prompt }
  ];

  if (imageFiles.length > 0) {
    for (const imageFile of imageFiles) {
        const imagePart = await fileToGenerativePart(imageFile);
        parts.push(imagePart);
    }
  }

  let responseText = '';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts }],
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
        console.error("Parsed response was not an array:", parsedJson);
        throw new Error("The AI response was not in the expected format (a list of test cases).");
    }
    
    return parsedJson as TestCase[];

  } catch (error) {
    console.error("Error generating test cases:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            throw new Error("The configured API key is invalid. Please check your environment variables.");
        }
        // Re-throw other errors to be caught by the UI, which will show the message.
        throw error; 
    }
    throw new Error("An unknown error occurred while generating test cases. Please check the console for details.");
  }
};
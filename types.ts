
export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum TestCaseType {
  Positive = 'Positive',
  Negative = 'Negative',
  Edge = 'Edge',
}

export interface TestCase {
  testCaseId: string;
  testScenario: string;
  preConditions: string;
  testSteps: string;
  testData: string;
  expectedResult: string;
  priority: Priority;
  type: TestCaseType;
}

export interface HistoryEntry {
  id: number; // Using timestamp as ID
  prdText: string;
  figmaLink: string;
  image?: {
    base64: string; // The Data URL
    name: string;
  };
  testCases: TestCase[];
}

export interface User {
    email: string;
}

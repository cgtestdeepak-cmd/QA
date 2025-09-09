

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

export enum TestCaseDomain {
  Functional = 'Functional',
  UIUX = 'UI/UX',
}

export enum TestSuiteType {
  Smoke = 'Smoke',
  Sanity = 'Sanity',
  Regression = 'Regression',
}

export enum TestCaseStatus {
  Untested = 'Untested',
  Pass = 'Pass',
  Fail = 'Fail',
  UnableToExecute = 'Unable to Execute',
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
  domain: TestCaseDomain;
  suiteType: TestSuiteType;
  status: TestCaseStatus;
}

export interface HistoryEntry {
  id: number; // Using timestamp as ID
  prdText: string;
  figmaLink: string;
  focusPrompt: string;
  images?: {
    base64: string; // The Data URL
    name: string;
  }[];
  testCases: TestCase[];
}

export interface User {
    email: string;
}
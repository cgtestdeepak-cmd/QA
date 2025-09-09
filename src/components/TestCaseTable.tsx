import React from 'react';
import { TestCase, Priority, TestCaseType, TestCaseDomain, TestSuiteType, TestCaseStatus } from '../types';

interface TestCaseTableProps {
  testCases: TestCase[];
  updateTestCase: (index: number, field: keyof TestCase, value: string) => void;
}

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const colorClasses = {
    [Priority.High]: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    [Priority.Medium]: 'bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    [Priority.Low]: 'bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  };
  return <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[priority]}`}>{priority}</span>;
};

const TypeBadge = ({ type }: { type: TestCaseType }) => {
  const colorClasses = {
    [TestCaseType.Positive]: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    [TestCaseType.Negative]: 'bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    [TestCaseType.Edge]: 'bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
  };
  return <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[type]}`}>{type}</span>;
};

const DomainBadge = ({ domain }: { domain: TestCaseDomain }) => {
  const colorClasses = {
    [TestCaseDomain.Functional]: 'bg-teal-500/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',
    [TestCaseDomain.UIUX]: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  };
  // Default to Functional if domain is somehow missing (for old history items)
  const effectiveDomain = domain || TestCaseDomain.Functional;
  return <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[effectiveDomain]}`}>{effectiveDomain}</span>;
};

const SuiteTypeBadge = ({ suiteType }: { suiteType: TestSuiteType }) => {
  const colorClasses = {
    [TestSuiteType.Smoke]: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    [TestSuiteType.Sanity]: 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
    [TestSuiteType.Regression]: 'bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
  };
  // Default to Regression for old history items
  const effectiveSuiteType = suiteType || TestSuiteType.Regression;
  return <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[effectiveSuiteType]}`}>{effectiveSuiteType}</span>;
};

const StatusSelector = ({ status, onChange }: { status: TestCaseStatus, onChange: (newStatus: TestCaseStatus) => void }) => {
  const colorClasses = {
    [TestCaseStatus.Pass]: 'bg-success/10 text-success border-success/30',
    [TestCaseStatus.Fail]: 'bg-danger/10 text-danger border-danger/30',
    [TestCaseStatus.UnableToExecute]: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    [TestCaseStatus.Untested]: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30',
  };
  
  const effectiveStatus = status || TestCaseStatus.Untested;

  return (
    <div className="relative">
      <select
        value={effectiveStatus}
        onChange={(e) => onChange(e.target.value as TestCaseStatus)}
        className={`w-full appearance-none cursor-pointer pl-3 pr-8 py-1 text-xs font-semibold rounded-full border focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${colorClasses[effectiveStatus]}`}
      >
        {Object.values(TestCaseStatus).map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  );
};


export const TestCaseTable: React.FC<TestCaseTableProps> = ({ testCases, updateTestCase }) => {

  const handleBlur = <K extends keyof TestCase>(index: number, field: K) => (e: React.FocusEvent<HTMLTableCellElement | HTMLDivElement>) => {
    updateTestCase(index, field, e.currentTarget.innerText);
  };

  const CardField = ({ label, value, onBlur, isPreformatted = false }: { label: string, value: string, onBlur: (e: React.FocusEvent<HTMLDivElement>) => void, isPreformatted?: boolean }) => (
    <div>
      <h4 className="text-xs font-semibold uppercase text-text-light-secondary dark:text-text-dark-secondary mt-3 mb-1">{label}</h4>
      <div 
        contentEditable 
        suppressContentEditableWarning 
        onBlur={onBlur}
        className={`text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text p-2 rounded-md bg-content-light dark:bg-content-dark hover:bg-bkg-light dark:hover:bg-border-dark/30 focus:outline-none focus:ring-2 focus:ring-primary ${isPreformatted ? 'whitespace-pre-wrap' : ''}`}
      >
        {value}
      </div>
    </div>
  );

  return (
    <>
      {/* Card view for mobile screens */}
      <div className="space-y-4 md:hidden">
        {testCases.map((tc, index) => (
          <div key={tc.testCaseId || index} className="bg-bkg-light dark:bg-content-dark rounded-lg p-4 border border-border-light dark:border-border-dark shadow-md transition-shadow hover:shadow-lg">
            <div className="flex justify-between items-start mb-2 gap-2">
              <div 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={handleBlur(index, 'testCaseId')}
                className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary cursor-text p-1 -m-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {tc.testCaseId}
              </div>
              <div className="flex flex-col sm:flex-row items-end gap-2 flex-shrink-0">
                <DomainBadge domain={tc.domain} />
                <PriorityBadge priority={tc.priority} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
                <SuiteTypeBadge suiteType={tc.suiteType} />
                <TypeBadge type={tc.type} />
            </div>
            
            <CardField label="Scenario" value={tc.testScenario} onBlur={handleBlur(index, 'testScenario')} />
            <CardField label="Pre-Conditions" value={tc.preConditions} onBlur={handleBlur(index, 'preConditions')} />
            <CardField label="Test Steps" value={tc.testSteps} onBlur={handleBlur(index, 'testSteps')} isPreformatted />
            <CardField label="Test Data" value={tc.testData} onBlur={handleBlur(index, 'testData')} />
            <CardField label="Expected Result" value={tc.expectedResult} onBlur={handleBlur(index, 'expectedResult')} />

            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase text-text-light-secondary dark:text-text-dark-secondary mb-1">Status</h4>
              <StatusSelector 
                  status={tc.status} 
                  onChange={(newStatus) => updateTestCase(index, 'status', newStatus)} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Table view for larger screens */}
      <div className="overflow-x-auto hidden md:block rounded-lg border border-border-light dark:border-border-dark">
        <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
          <thead className="bg-bkg-light dark:bg-content-dark/50">
            <tr>
              {['ID', 'Scenario', 'Pre-Conditions', 'Test Steps', 'Test Data', 'Expected Result', 'Domain', 'Priority', 'Test Suite', 'Type', 'Status'].map(header => (
                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-content-light dark:bg-content-dark divide-y divide-border-light dark:divide-border-dark">
            {testCases.map((tc, index) => (
              <tr key={tc.testCaseId || index} className="transition-colors even:bg-bkg-light/50 dark:even:bg-white/5 hover:bg-violet-50 dark:hover:bg-border-dark">
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'testCaseId')} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light-primary dark:text-text-dark-primary cursor-text">{tc.testCaseId}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'testScenario')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text min-w-[200px]">{tc.testScenario}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'preConditions')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text min-w-[200px]">{tc.preConditions}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'testSteps')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text whitespace-pre-wrap min-w-[300px]">{tc.testSteps}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'testData')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text min-w-[150px]">{tc.testData}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'expectedResult')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text min-w-[200px]">{tc.expectedResult}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  <DomainBadge domain={tc.domain} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  <PriorityBadge priority={tc.priority} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  <SuiteTypeBadge suiteType={tc.suiteType} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  <TypeBadge type={tc.type} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm min-w-[160px]">
                    <StatusSelector 
                        status={tc.status} 
                        onChange={(newStatus) => updateTestCase(index, 'status', newStatus)} 
                    />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
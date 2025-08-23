import React from 'react';
import { TestCase, Priority, TestCaseType } from '../types';

interface TestCaseTableProps {
  testCases: TestCase[];
  updateTestCase: (index: number, field: keyof TestCase, value: string) => void;
}

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const colorClasses = {
    [Priority.High]: 'bg-red-500/20 text-red-500 dark:text-red-400',
    [Priority.Medium]: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    [Priority.Low]: 'bg-green-500/20 text-green-600 dark:text-green-400',
  };
  return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[priority]}`}>{priority}</span>;
};

const TypeBadge = ({ type }: { type: TestCaseType }) => {
  const colorClasses = {
    [TestCaseType.Positive]: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    [TestCaseType.Negative]: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    [TestCaseType.Edge]: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  };
  return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[type]}`}>{type}</span>;
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
        className={`text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text p-2 rounded-md bg-content-light dark:bg-content-dark hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-primary-start ${isPreformatted ? 'whitespace-pre-wrap' : ''}`}
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
          <div key={tc.testCaseId || index} className="bg-bkg-light dark:bg-bkg-dark/50 rounded-lg p-4 border border-border-light dark:border-border-dark">
            <div className="flex justify-between items-start mb-2 gap-2">
              <div 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={handleBlur(index, 'testCaseId')}
                className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary cursor-text p-1 -m-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-start"
              >
                {tc.testCaseId}
              </div>
              <div className="flex flex-col sm:flex-row items-end gap-2 flex-shrink-0">
                <PriorityBadge priority={tc.priority} />
                <TypeBadge type={tc.type} />
              </div>
            </div>
            
            <CardField label="Scenario" value={tc.testScenario} onBlur={handleBlur(index, 'testScenario')} />
            <CardField label="Pre-Conditions" value={tc.preConditions} onBlur={handleBlur(index, 'preConditions')} />
            <CardField label="Test Steps" value={tc.testSteps} onBlur={handleBlur(index, 'testSteps')} isPreformatted />
            <CardField label="Test Data" value={tc.testData} onBlur={handleBlur(index, 'testData')} />
            <CardField label="Expected Result" value={tc.expectedResult} onBlur={handleBlur(index, 'expectedResult')} />

          </div>
        ))}
      </div>

      {/* Table view for larger screens */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
          <thead className="bg-bkg-light dark:bg-content-dark/50">
            <tr>
              {['ID', 'Scenario', 'Pre-Conditions', 'Test Steps', 'Test Data', 'Expected Result', 'Priority', 'Type'].map(header => (
                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-content-light dark:bg-content-dark divide-y divide-border-light dark:divide-border-dark">
            {testCases.map((tc, index) => (
              <tr key={tc.testCaseId || index} className="hover:bg-bkg-light dark:hover:bg-bkg-dark/50 transition-colors">
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'testCaseId')} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light-primary dark:text-text-dark-primary cursor-text">{tc.testCaseId}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'testScenario')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text min-w-[200px]">{tc.testScenario}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'preConditions')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text min-w-[200px]">{tc.preConditions}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'testSteps')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text whitespace-pre-wrap min-w-[300px]">{tc.testSteps}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'testData')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text min-w-[150px]">{tc.testData}</td>
                <td contentEditable suppressContentEditableWarning onBlur={handleBlur(index, 'expectedResult')} className="px-6 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary cursor-text min-w-[200px]">{tc.expectedResult}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  <PriorityBadge priority={tc.priority} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  <TypeBadge type={tc.type} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
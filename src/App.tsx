import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { TestCase, HistoryEntry, User, TestCaseDomain, TestSuiteType, TestCaseStatus, TestCaseType } from './types';
import { generateTestCases } from './services/geminiService';
import { SunIcon, MoonIcon, TrashIcon, SpinnerIcon, MenuIcon, LogOutIcon, SpreadsheetIcon, GoogleSheetIcon, XIcon, CheckIcon, CopyIcon } from './components/icons';
import { InputArea } from './components/InputArea';
import { TestCaseTable } from './components/TestCaseTable';
import { Sidebar } from './components/Sidebar';
import { Auth } from './components/Auth';
import { fileToBase64, base64ToFile } from './utils';

type Theme = 'light' | 'dark';

const loadingMessages = [
  "Analyzing your requirements...",
  "Consulting the design specs...",
  "Crafting positive test cases...",
  "Thinking about edge cases...",
  "Generating negative scenarios...",
  "Finalizing the test suite...",
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [prdText, setPrdText] = useState('');
  const [figmaLink, setFigmaLink] = useState('');
  const [focusPrompt, setFocusPrompt] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
  const [error, setError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [googleExportStatus, setGoogleExportStatus] = useState('');
  const [showSheetsCopyMessage, setShowSheetsCopyMessage] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    // Check for logged-in user
    try {
      const savedUser = localStorage.getItem('qa_assistant_currentUser');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
      localStorage.removeItem('qa_assistant_currentUser');
    }
    
    // Theme setup
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const userPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (userPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    if (!currentUser) return; // Don't load history if not logged in
    try {
      // User-specific history
      const savedHistory = localStorage.getItem(`testCaseHistory_${currentUser.email}`);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      } else {
        setHistory([]); // Clear history for new user
      }
    } catch (e) {
      console.error("Failed to load history from local storage", e);
      if (currentUser) {
        localStorage.removeItem(`testCaseHistory_${currentUser.email}`);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const scrollThreshold = 100; // Only start hiding after scrolling 100px

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < scrollThreshold) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsHeaderVisible(false);
      } else {
        // Scrolling up
        setIsHeaderVisible(true);
      }
      lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    if (showSheetsCopyMessage) {
        const timer = setTimeout(() => {
            setShowSheetsCopyMessage(false);
        }, 15000); // Auto-dismiss after 15 seconds
        return () => clearTimeout(timer);
    }
  }, [showSheetsCopyMessage]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      let i = 0;
      setCurrentLoadingMessage(loadingMessages[0]);
      interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setCurrentLoadingMessage(loadingMessages[i]);
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);


  const saveHistory = (updatedHistory: HistoryEntry[]) => {
      if (!currentUser) return;
      setHistory(updatedHistory);
      localStorage.setItem(`testCaseHistory_${currentUser.email}`, JSON.stringify(updatedHistory));
  };
  
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('qa_assistant_currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('qa_assistant_currentUser');
    // Clear state
    setPrdText('');
    setFigmaLink('');
    setFocusPrompt('');
    setImages([]);
    setTestCases([]);
    setError(null);
    setHistory([]);
  };


  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setShowSheetsCopyMessage(false);
    try {
      const results = await generateTestCases(prdText, figmaLink, images, focusPrompt);
      const resultsWithStatus = results.map(tc => ({
        ...tc,
        status: TestCaseStatus.Untested,
      }));
      setTestCases(resultsWithStatus);

      let imageDatas: HistoryEntry['images'] = [];
      if (images.length > 0) {
        imageDatas = await Promise.all(images.map(async (img) => {
          const base64 = await fileToBase64(img);
          return { base64, name: img.name };
        }));
      }
      
      const newEntry: HistoryEntry = {
        id: Date.now(),
        prdText,
        figmaLink,
        focusPrompt,
        images: imageDatas.length > 0 ? imageDatas : undefined,
        testCases: resultsWithStatus,
      };
      saveHistory([newEntry, ...history]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setPrdText('');
    setFigmaLink('');
    setFocusPrompt('');
    setImages([]);
    setTestCases([]);
    setError(null);
    setExportStatus('');
    setCopyStatus('');
    setShowSheetsCopyMessage(false);
  };
  
  const handleSelectHistory = (id: number) => {
      const entry = history.find(item => item.id === id);
      if (entry) {
          setPrdText(entry.prdText);
          setFigmaLink(entry.figmaLink);
          setFocusPrompt(entry.focusPrompt || '');
          const casesWithStatus = entry.testCases.map(tc => ({
              ...tc,
              status: tc.status || TestCaseStatus.Untested
          }));
          setTestCases(casesWithStatus);
          setError(null);
          setExportStatus('');
          setCopyStatus('');
          setShowSheetsCopyMessage(false);
          
          if (entry.images && entry.images.length > 0) {
            const imageFiles = entry.images.map(imgData => 
              base64ToFile(imgData.base64, imgData.name)
            );
            setImages(imageFiles);
          } else {
            setImages([]);
          }
      }
  };

  const handleDeleteHistory = (id: number) => {
      const updatedHistory = history.filter(item => item.id !== id);
      saveHistory(updatedHistory);
  };
  
  const handleClearHistory = () => {
      if (window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
        saveHistory([]);
      }
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    setTestCases(prev => {
      const newTestCases = [...prev];
      if (newTestCases[index]) {
        (newTestCases[index] as any)[field] = value;
      }
      return newTestCases;
    });
  };

  const handleDownloadExcel = () => {
    if (testCases.length === 0) {
        setExportStatus('No data to export.');
        setTimeout(() => setExportStatus(''), 2000);
        return;
    }

    try {
        const worksheetData = testCases.map(tc => ({
            'TC_ID': tc.testCaseId,
            'Scenario': tc.testScenario,
            'pre-condition': tc.preConditions,
            'test steps': tc.testSteps,
            'test data': tc.testData,
            'expected result': tc.expectedResult,
            'domain': tc.domain || 'Functional',
            'priority': tc.priority,
            'test suite type': tc.suiteType || 'Regression',
            'type': tc.type || 'Positive',
            'status': tc.status || 'Untested',
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        
        // Set column widths for better layout
        worksheet['!cols'] = [
            { wch: 15 }, // TC_ID
            { wch: 40 }, // Scenario
            { wch: 40 }, // pre-condition
            { wch: 50 }, // test steps
            { wch: 30 }, // test data
            { wch: 40 }, // expected result
            { wch: 15 }, // domain
            { wch: 10 }, // priority
            { wch: 15 }, // test suite type
            { wch: 15 }, // type
            { wch: 20 }, // status
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');

        // This function handles the download in the browser
        XLSX.writeFile(workbook, 'test-cases.xlsx');
        
        setExportStatus('Downloaded!');
        setTimeout(() => setExportStatus(''), 2000);

    } catch (error) {
        console.error("Error downloading Excel file:", error);
        setExportStatus('Download failed.');
        setTimeout(() => setExportStatus(''), 2000);
    }
  };

  const formatTestCasesAsTsv = (): string => {
    const headers = [
        'TC_ID', 'Scenario', 'pre-condition', 'test steps', 'test data', 
        'expected result', 'domain', 'priority', 'test suite type', 'type', 'status'
    ];
    
    const dataRows = testCases.map(tc => [
        tc.testCaseId,
        tc.testScenario,
        tc.preConditions,
        tc.testSteps,
        tc.testData,
        tc.expectedResult,
        tc.domain || TestCaseDomain.Functional,
        tc.priority,
        tc.suiteType || TestSuiteType.Regression,
        tc.type || TestCaseType.Positive,
        tc.status || TestCaseStatus.Untested,
    ]);

    const formatCell = (cellData: any): string => {
        let cell = String(cellData || '');
        // Replace tabs with spaces to avoid breaking TSV format
        cell = cell.replace(/\t/g, ' ');
        // If the cell contains a newline, or double quote, wrap it in double quotes
        if (cell.search(/("|\n)/g) >= 0) {
            // Escape existing double quotes by doubling them
            cell = cell.replace(/"/g, '""');
            cell = `"${cell}"`;
        }
        return cell;
    };

    return [
        headers.join('\t'),
        ...dataRows.map(row => row.map(formatCell).join('\t'))
    ].join('\n');
  };

  const handleCopyAll = () => {
    if (testCases.length === 0) {
        setCopyStatus('No data.');
        setTimeout(() => setCopyStatus(''), 2000);
        return;
    }

    setCopyStatus('Copying...');

    try {
        const tsvContent = formatTestCasesAsTsv();
        navigator.clipboard.writeText(tsvContent).then(() => {
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus(''), 3000);
        }, (err) => {
            console.error('Failed to copy to clipboard', err);
            setCopyStatus('Copy failed.');
            setTimeout(() => setCopyStatus(''), 2000);
        });

    } catch (error) {
        console.error("Error copying data:", error);
        setCopyStatus('Copy failed.');
        setTimeout(() => setCopyStatus(''), 2000);
    }
  };
  
  const handleExportToGoogleSheets = () => {
    if (testCases.length === 0) {
        setGoogleExportStatus('No data.');
        setTimeout(() => setGoogleExportStatus(''), 2000);
        return;
    }

    setGoogleExportStatus('Copying...');

    try {
        const tsvContent = formatTestCasesAsTsv();
        navigator.clipboard.writeText(tsvContent).then(() => {
            setShowSheetsCopyMessage(true);
            setGoogleExportStatus('Copied!');
            window.open('https://sheet.new', '_blank');
            setTimeout(() => setGoogleExportStatus(''), 3000);
        }, (err) => {
            console.error('Failed to copy to clipboard', err);
            setGoogleExportStatus('Copy failed.');
            setTimeout(() => setGoogleExportStatus(''), 2000);
        });

    } catch (error) {
        console.error("Error exporting to Google Sheets:", error);
        setGoogleExportStatus('Export failed.');
        setTimeout(() => setGoogleExportStatus(''), 2000);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all test cases? This cannot be undone.')) {
        setTestCases([]);
        setShowSheetsCopyMessage(false);
    }
  };
  
  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  const renderCopyButtonContent = () => {
    if (copyStatus === 'Copied!') {
      return <><CheckIcon className="h-4 w-4 mr-1" /> Copied!</>;
    }
    if (copyStatus) {
        return copyStatus;
    }
    return <><CopyIcon className="h-4 w-4 mr-1" /> Copy All</>;
  };

  const renderGoogleSheetsButtonContent = () => {
    if (googleExportStatus === 'Copied!') {
      return <><CheckIcon className="h-4 w-4 mr-1" /> Copied!</>;
    }
    if (googleExportStatus) {
        return googleExportStatus;
    }
    return <><GoogleSheetIcon className="h-4 w-4 mr-1" /> Open in Sheets</>;
  };


  return (
    <div className="min-h-screen text-text-light-primary dark:text-text-dark-primary">
      <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          history={history}
          onSelect={handleSelectHistory}
          onDelete={handleDeleteHistory}
          onClear={handleClearHistory}
      />
      <header className={`bg-content-light/80 dark:bg-content-dark/80 backdrop-blur-sm border-b border-border-light dark:border-border-dark shadow-sm sticky top-0 z-10 transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-full hover:bg-bkg-light dark:hover:bg-border-dark transition-colors"
              aria-label="Open history menu"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              QA Assistant
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary hidden sm:block truncate max-w-[150px]">{currentUser.email}</span>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-bkg-light dark:hover:bg-border-dark transition-colors">
              {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-bkg-light dark:hover:bg-border-dark transition-colors" aria-label="Logout">
              <LogOutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <InputArea
          prdText={prdText}
          setPrdText={setPrdText}
          figmaLink={figmaLink}
          setFigmaLink={setFigmaLink}
          focusPrompt={focusPrompt}
          setFocusPrompt={setFocusPrompt}
          images={images}
          setImages={setImages}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          hasTestCases={testCases.length > 0}
          onRefresh={handleRefresh}
        />

        {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        {isLoading && (
            <div className="bg-content-light dark:bg-content-dark p-6 rounded-xl shadow-lg border border-border-light dark:border-border-dark flex flex-col items-center justify-center space-y-4">
                <SpinnerIcon className="h-12 w-12 text-primary animate-spin" />
                <p className="text-lg font-semibold">{currentLoadingMessage}</p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">This might take a moment. Please wait.</p>
            </div>
        )}

        {!isLoading && testCases.length > 0 && (
          <div className="bg-content-light dark:bg-content-dark p-4 sm:p-6 rounded-2xl shadow-xl border border-border-light dark:border-border-dark">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <h2 className="text-xl font-bold">Generated Test Cases</h2>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success border border-success rounded-md hover:bg-success/10 transition-colors">
                  <SpreadsheetIcon className="h-4 w-4" /> {exportStatus || 'Download Excel'}
                </button>
                <button onClick={handleCopyAll} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary border border-secondary rounded-md hover:bg-secondary/10 transition-colors">
                  {renderCopyButtonContent()}
                </button>
                <button onClick={handleExportToGoogleSheets} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors">
                  {renderGoogleSheetsButtonContent()}
                </button>
                <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger border border-danger rounded-md hover:bg-danger/10 transition-colors">
                    <TrashIcon className="h-4 w-4" /> Clear All
                </button>
              </div>
            </div>
            {showSheetsCopyMessage && (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 px-4 py-3 rounded-lg relative my-4 flex items-center justify-between gap-4" role="alert">
                    <div>
                        <strong className="font-bold">Copied to clipboard!</strong>
                        <span className="block sm:inline sm:ml-2">A new Google Sheet is opening. Just paste your data (like Ctrl+V) into cell A1.</span>
                    </div>
                    <button 
                        onClick={() => setShowSheetsCopyMessage(false)} 
                        className="p-1.5 rounded-full hover:bg-blue-500/20 flex-shrink-0"
                        aria-label="Dismiss message"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
            )}
            <TestCaseTable testCases={testCases} updateTestCase={updateTestCase} />
          </div>
        )}

        {!isLoading && !error && testCases.length === 0 && (
             <div className="text-center py-12 px-6 bg-content-light dark:bg-content-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark">
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Ready to begin?</h3>
                <p className="mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Add your PRD content above and click "Generate Test Cases" to see the magic happen.
                </p>
            </div>
        )}
      </main>
    </div>
  );
}
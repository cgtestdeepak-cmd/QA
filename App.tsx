
import React, { useState, useEffect, useCallback } from 'react';
import { TestCase, HistoryEntry, User } from './types';
import { generateTestCases } from './services/geminiService';
import { SunIcon, MoonIcon, DownloadIcon, CopyIcon, TrashIcon, SpinnerIcon, MenuIcon, LogOutIcon } from './components/icons';
import { InputArea } from './components/InputArea';
import { TestCaseTable } from './components/TestCaseTable';
import { Sidebar } from './components/Sidebar';
import { Auth } from './components/Auth';
import { fileToBase64, base64ToFile } from './utils';

type Theme = 'light' | 'dark';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [prdText, setPrdText] = useState('');
  const [figmaLink, setFigmaLink] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
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
    setImage(null);
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
    try {
      const results = await generateTestCases(prdText, figmaLink, image);
      setTestCases(results);

      let imageDa: HistoryEntry['image'] = undefined;
      if (image) {
          const base64 = await fileToBase64(image);
          imageDa = { base64, name: image.name };
      }
      
      const newEntry: HistoryEntry = {
        id: Date.now(),
        prdText,
        figmaLink,
        image: imageDa,
        testCases: results,
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
    setImage(null);
    setTestCases([]);
    setError(null);
    setCopyStatus('');
  };
  
  const handleSelectHistory = (id: number) => {
      const entry = history.find(item => item.id === id);
      if (entry) {
          setPrdText(entry.prdText);
          setFigmaLink(entry.figmaLink);
          setTestCases(entry.testCases);
          setError(null);
          setCopyStatus('');
          
          if (entry.image) {
              const imageFile = base64ToFile(entry.image.base64, entry.image.name);
              setImage(imageFile);
          } else {
              setImage(null);
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

  const convertToCsv = useCallback(() => {
    if (testCases.length === 0) return '';
    const headers = Object.keys(testCases[0]);
    const csvRows = [
      headers.join(','),
      ...testCases.map(row => 
        headers.map(fieldName => {
          const value = String(row[fieldName as keyof TestCase] || '');
          return `"${value.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    return csvRows.join('\n');
  }, [testCases]);

  const handleDownloadCsv = () => {
    const csvContent = convertToCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'test_cases.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = () => {
    const csvContent = convertToCsv();
    navigator.clipboard.writeText(csvContent).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    }, () => {
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 2000);
    });
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all test cases? This cannot be undone.')) {
        setTestCases([]);
    }
  };
  
  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }


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
              className="p-2 rounded-full hover:bg-bkg-light dark:hover:bg-gray-700/50 transition-colors"
              aria-label="Open history menu"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              QA Assistant
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary hidden sm:block truncate max-w-[150px]">{currentUser.email}</span>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-bkg-light dark:hover:bg-gray-700/50 transition-colors">
              {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-bkg-light dark:hover:bg-gray-700/50 transition-colors" aria-label="Logout">
              <LogOutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <InputArea
          prdText={prdText}
          setPrdText={setPrdText}
          figmaLink={figmaLink}
          setFigmaLink={setFigmaLink}
          image={image}
          setImage={setImage}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          hasTestCases={testCases.length > 0}
          onRefresh={handleRefresh}
        />

        {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-danger px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        {isLoading && (
            <div className="bg-content-light dark:bg-content-dark p-6 rounded-xl shadow-lg border border-border-light dark:border-border-dark flex flex-col items-center justify-center space-y-4">
                <SpinnerIcon className="h-12 w-12 text-primary-start animate-spin" />
                <p className="text-lg font-semibold">Generating test cases...</p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">This might take a moment. Please wait.</p>
            </div>
        )}

        {!isLoading && testCases.length > 0 && (
          <div className="bg-content-light dark:bg-content-dark p-6 rounded-xl shadow-lg border border-border-light dark:border-border-dark">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <h2 className="text-xl font-bold">Generated Test Cases</h2>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button onClick={handleDownloadCsv} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-start border border-primary-start rounded-md hover:bg-primary-start/10 transition-colors">
                  <DownloadIcon className="h-4 w-4" /> Download CSV
                </button>
                <button onClick={handleCopyToClipboard} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary border border-secondary rounded-md hover:bg-secondary/10 transition-colors">
                  <CopyIcon className="h-4 w-4" /> {copyStatus || 'Copy as CSV'}
                </button>
                <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger border border-danger rounded-md hover:bg-danger/10 transition-colors">
                    <TrashIcon className="h-4 w-4" /> Clear All
                </button>
              </div>
            </div>
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

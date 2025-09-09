import React from 'react';
import { HistoryEntry } from '../types';
import { XIcon, TrashIcon } from './icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, history, onSelect, onDelete, onClear }) => {
  const handleSelect = (id: number) => {
    onSelect(id);
    onClose();
  };
  
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-20 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside className={`fixed top-0 left-0 h-full w-full max-w-xs sm:w-80 bg-content-light dark:bg-content-dark shadow-2xl transform transition-transform z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold">History</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-bkg-light dark:hover:bg-gray-700/50">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          {history.length > 0 ? (
            <>
              <div className="flex-grow overflow-y-auto">
                {history.map(entry => (
                  <div key={entry.id} className="group flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark hover:bg-bkg-light dark:hover:bg-bkg-dark/50 cursor-pointer" onClick={() => handleSelect(entry.id)}>
                    <div className="truncate">
                      <p className="font-medium text-sm">{new Date(entry.id).toLocaleString()}</p>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary truncate">{entry.prdText.substring(0, 50) || "No PRD text"}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this history item?')) {
                          onDelete(entry.id);
                        }
                      }} 
                      className="p-2 rounded-full text-gray-400 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete history item"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border-light dark:border-border-dark">
                <button onClick={onClear} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-danger border border-danger rounded-md hover:bg-danger/10 transition-colors">
                    <TrashIcon className="h-4 w-4" /> Clear All History
                </button>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-center p-4">
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">No history yet. Generate some test cases to get started!</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
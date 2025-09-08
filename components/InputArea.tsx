import React, { useState, useCallback, useEffect } from 'react';
import { extractTextFromPdf } from '../services/pdfParser';
import { SpinnerIcon, XIcon, ImageIcon, RefreshIcon } from './icons';

interface InputAreaProps {
  prdText: string;
  setPrdText: (text: string) => void;
  figmaLink: string;
  setFigmaLink: (link: string) => void;
  focusPrompt: string;
  setFocusPrompt: (prompt: string) => void;
  images: File[];
  setImages: (files: File[]) => void;
  onGenerate: () => void;
  isLoading: boolean;
  hasTestCases: boolean;
  onRefresh: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({ 
  prdText, setPrdText, 
  figmaLink, setFigmaLink, 
  focusPrompt, setFocusPrompt,
  images, setImages,
  onGenerate, isLoading, hasTestCases,
  onRefresh
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (images.length > 0) {
      const objectUrls = images.map(file => URL.createObjectURL(file));
      setImagePreviews(objectUrls);
      return () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
      };
    } else {
      setImagePreviews([]);
    }
  }, [images]);

  const handleFile = useCallback(async (file: File) => {
    if (file.type === 'application/pdf') {
      try {
        const text = await extractTextFromPdf(file);
        setPrdText(text);
      } catch (e) {
        alert('Failed to parse PDF file.');
        console.error(e);
      }
    } else if (file.type.startsWith('text/')) {
      const text = await file.text();
      setPrdText(text);
    } else {
      alert('Unsupported file type. Please upload a PDF or a plain text file.');
    }
  }, [setPrdText]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImageFiles = (files: FileList) => {
    const newFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`Unsupported file type: ${file.name}. Please upload PNG, JPEG, or WEBP files.`);
        return false;
      }
      if (images.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
          return false; // Skip duplicate
      }
      return true;
    });
    setImages([...images, ...newFiles]);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFiles(e.target.files);
    }
    // Reset file input to allow selecting the same file again
    e.target.value = '';
  };

  const handleImageDragOver = (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageDragging(true);
  };

  const handleImageDragLeave = (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageDragging(false);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };
  
  const showRefreshButton = prdText || figmaLink || images.length > 0 || hasTestCases || focusPrompt;
  const canGenerate = !!(prdText.trim() || figmaLink.trim() || images.length > 0);

  return (
    <div className="bg-content-light dark:bg-content-dark p-6 rounded-2xl shadow-xl space-y-6 border border-border-light dark:border-border-dark">
      <div>
        <label htmlFor="focus-prompt" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Generation Focus (Optional)
        </label>
        <input
          type="text"
          id="focus-prompt"
          value={focusPrompt}
          onChange={(e) => setFocusPrompt(e.target.value)}
          placeholder="e.g., 'Focus only on the login flow from the PRD'"
          className="w-full px-4 py-2 bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-text-light-primary dark:text-text-dark-primary"
          aria-label="Generation Focus Prompt"
        />
      </div>

      <div 
        className={`relative transition-all duration-300 rounded-lg border-2 border-dashed ${isDragging ? 'border-primary bg-primary/10' : 'border-border-light dark:border-border-dark'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          value={prdText}
          onChange={(e) => setPrdText(e.target.value)}
          placeholder="Paste your PRD content here, or drag & drop a PDF/TXT file."
          className="w-full h-48 sm:h-64 p-4 bg-transparent rounded-lg resize-y focus:ring-2 focus:ring-primary focus:outline-none text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
          aria-label="Product Requirements Document Content"
        />
        <div className="absolute bottom-3 right-3">
          <label htmlFor="file-upload" className="cursor-pointer text-sm font-medium text-primary hover:text-primary-dark">
            Or upload a file
          </label>
          <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.txt,.md" />
        </div>
      </div>

      <div>
        <label htmlFor="figma-link" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Figma Design Link (Optional)
        </label>
        <input
          type="url"
          id="figma-link"
          value={figmaLink}
          onChange={(e) => setFigmaLink(e.target.value)}
          placeholder="https://www.figma.com/..."
          className="w-full px-4 py-2 bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-text-light-primary dark:text-text-dark-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Reference Images (Optional)
        </label>
        <div className="mt-2">
            {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imagePreviews.map((previewUrl, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img src={previewUrl} alt={`Preview ${images[index]?.name || index + 1}`} className="w-full h-full object-cover rounded-lg border border-border-light dark:border-border-dark" />
                            <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label={`Remove image ${index + 1}`}
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    <label htmlFor="image-upload" className={`relative flex justify-center items-center w-full aspect-square rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer ${isImageDragging ? 'border-primary bg-primary/10' : 'border-border-light dark:border-border-dark'}`}
                        onDragOver={handleImageDragOver}
                        onDragLeave={handleImageDragLeave}
                        onDrop={handleImageDrop}
                    >
                        <div className="flex flex-col items-center justify-center w-full h-full text-center p-2">
                            <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-1" />
                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Add more</p>
                        </div>
                    </label>
                </div>
            ) : (
              <div
                className={`relative flex justify-center items-center w-full h-48 rounded-lg border-2 border-dashed transition-all duration-300 ${isImageDragging ? 'border-primary bg-primary/10' : 'border-border-light dark:border-border-dark'}`}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
              >
                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-full text-center cursor-pointer p-4">
                  <ImageIcon className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">PNG, JPG, WEBP (multiple allowed)</p>
                </label>
              </div>
            )}
            <input id="image-upload" name="image-upload" type="file" multiple className="sr-only" onChange={handleImageFileChange} accept="image/png,image/jpeg,image/webp" />
        </div>
      </div>


      <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
        {showRefreshButton && (
            <button
                onClick={onRefresh}
                className="flex items-center justify-center px-4 py-3 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-100 dark:hover:bg-content-dark transition-colors"
                aria-label="Start over with new data"
            >
                <RefreshIcon className="-ml-1 mr-2 h-5 w-5" />
                Start Over
            </button>
        )}
        <button
          onClick={onGenerate}
          disabled={isLoading || !canGenerate}
          className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary to-primary-light text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed dark:disabled:from-gray-600 dark:disabled:to-gray-700 transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Generating...
            </>
          ) : (
            hasTestCases ? 'Regenerate Test Cases' : 'Generate Test Cases'
          )}
        </button>
      </div>
    </div>
  );
};
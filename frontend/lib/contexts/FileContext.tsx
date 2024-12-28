'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FileService, FileMetadata } from '@/lib/services/fileService';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useToast } from '@/components/ui/use-toast';

interface FileContextType {
  files: FileMetadata[];
  isLoading: boolean;
  selectedFile: FileMetadata | null;
  setSelectedFile: (file: FileMetadata | null) => void;
  refreshFiles: () => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const auth = useSelector((state: RootState) => state.auth);
  const { toast } = useToast();

  const refreshFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedFiles = await FileService.listFiles();
      setFiles(fetchedFiles);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch files',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      await FileService.deleteFile(fileId);
      await refreshFiles();
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }, [refreshFiles, selectedFile]);

  // Initial file fetch
  useEffect(() => {
    if (auth?.isAuthenticated) {
      refreshFiles();
    }
  }, [refreshFiles, auth?.isAuthenticated]);

  useEffect(() => {
    // Only set selected file if there isn't one already selected
    // and we have files to select from
    if (!selectedFile && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, [files, selectedFile]);

  return (
    <FileContext.Provider
      value={{
        files,
        isLoading,
        selectedFile,
        setSelectedFile,
        refreshFiles,
        deleteFile,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}

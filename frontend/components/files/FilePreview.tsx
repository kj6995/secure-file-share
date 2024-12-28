'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { FileService, FileMetadata } from '@/lib/services/fileService';
import { EncryptionService } from '@/lib/services/encryptionService';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import { zoomPlugin, ZoomPlugin } from '@react-pdf-viewer/zoom';
import Image from 'next/image';

// Import core components
const PDFViewer = dynamic(() => import('@react-pdf-viewer/core').then(m => m.Viewer), { ssr: false });
const Worker = dynamic(() => import('@react-pdf-viewer/core').then(m => m.Worker), { ssr: false });

// Common file metadata interface that works for both regular and shared files
interface FilePreviewMetadata {
  filename: string;
  mime_type: string;
  size: number;
}

interface FilePreviewProps {
  selectedFile: FileMetadata | FilePreviewMetadata | null;
  downloadMethod?: () => Promise<{
    encryptedFile: Blob;
    encryptedKey: string;
  }>;
  className?: string;
  showFilename?: boolean;
}

export function FilePreview({ selectedFile, downloadMethod, className, showFilename = true }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const { toast } = useToast();

  // Create plugin instance
  const zoomPluginInstance = zoomPlugin();

  useEffect(() => {
    // Cleanup function for previous preview
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    let isMounted = true;
    setError(null);
    setPreviewUrl(null);

    const loadPreview = async () => {
      if (!selectedFile) return;

      try {
        setIsLoading(true);
        console.log('Loading preview for file:', {
          filename: selectedFile.filename,
          type: selectedFile.mime_type,
          size: selectedFile.size
        });

        // Download the encrypted file
        console.log('Downloading encrypted file...');
        let encryptedFile: Blob;
        let encryptedKey: string;

        if (downloadMethod) {
          // Use provided download method (for shared files)
          const result = await downloadMethod();
          encryptedFile = result.encryptedFile;
          encryptedKey = result.encryptedKey;
        } else if ('id' in selectedFile) {
          // Fallback to FileService for regular files
          const result = await FileService.downloadFile(selectedFile.id);
          encryptedFile = result.encryptedFile;
          encryptedKey = result.encryptedKey;
        } else {
          throw new Error('No download method available');
        }

        // Decrypt the file
        console.log('Decrypting file...');
        const arrayBuffer = await encryptedFile.arrayBuffer();
        const decryptedData = await EncryptionService.decryptFile(arrayBuffer, encryptedKey);

        if (!isMounted) return;

        // Create a blob URL for the decrypted file
        const decryptedBlob = new Blob([decryptedData], { type: selectedFile.mime_type });
        const url = URL.createObjectURL(decryptedBlob);
        console.log('Created preview URL');
        setPreviewUrl(url);
        setIsLoading(false);
      } catch (error: any) {
        console.error('Preview error:', error);
        if (!isMounted) return;
        
        const errorMessage = error.message || 'Failed to load preview';
        setError(errorMessage);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (selectedFile?.mime_type?.startsWith('image/') || selectedFile?.mime_type === 'application/pdf') {
      loadPreview();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedFile, downloadMethod]);

  if (!selectedFile) {
    return (
      <Card className={cn("h-full flex items-center justify-center text-muted-foreground", className)}>
        <div className="text-center">
          <FileIcon className="mx-auto h-12 w-12 mb-4" />
          <p>Select a file to preview</p>
        </div>
      </Card>
    );
  }

  const renderPDFViewer = () => {
    return (
      <div 
        className="h-full bg-white rounded-lg overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="absolute top-2 right-8 flex items-center gap-2 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm">
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
            onClick={() => {
              const newScale = Math.max(0.1, scale - 0.1);
              setScale(newScale);
              zoomPluginInstance.zoomTo?.(newScale);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          
          <span className="text-sm font-medium min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
            onClick={() => {
              const newScale = Math.min(5, scale + 0.1);
              setScale(newScale);
              zoomPluginInstance.zoomTo?.(newScale);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
        </div>
        <div className="h-full [&_.rpv-core__viewer]:!h-full [&_.rpv-core__inner-container]:!h-full [&_.rpv-core__viewer-zone]:!h-full [&_.rpv-core__doc]:!h-full [&_*]:!select-none">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            {previewUrl && (
              <PDFViewer
                fileUrl={previewUrl}
                plugins={[zoomPluginInstance]}
                defaultScale={scale}
                onZoom={(e) => {
                  setScale(e.scale);
                }}
              />
            )}
          </Worker>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("h-full flex flex-col overflow-hidden relative", className)}>
      {showFilename && selectedFile && (
        <h3 className="text-lg font-semibold px-6 pt-6 flex-none">{selectedFile.filename}</h3>
      )}
      <div className={cn("absolute inset-0 px-6 pb-6", showFilename && selectedFile ? "top-[72px]" : "top-0")}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : previewUrl ? (
          <div className="h-full">
            {selectedFile.mime_type?.startsWith('image/') ? (
              <div className="h-full flex items-center justify-center bg-muted/10 rounded-lg p-4">
                <Image
                  src={previewUrl}
                  alt={selectedFile.filename}
                  width={800}
                  height={600}
                  style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }}
                  className="rounded-lg"
                />
              </div>
            ) : selectedFile.mime_type === 'application/pdf' ? (
              renderPDFViewer()
            ) : (
              <div className="h-full overflow-auto rounded-lg bg-muted p-4">
                <pre className="whitespace-pre-wrap break-words">
                  {previewUrl}
                </pre>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <FileIcon className="mx-auto h-12 w-12 mb-4" />
            <p>{error}</p>
            <p className="text-sm mt-2">File: {selectedFile.filename}</p>
            <p className="text-sm">Type: {selectedFile.mime_type}</p>
            <p className="text-sm">Size: {selectedFile.size} bytes</p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <FileIcon className="mx-auto h-12 w-12 mb-4" />
            <p>Failed to load preview</p>
            <p className="text-sm mt-2">File: {selectedFile.filename}</p>
            <p className="text-sm">Type: {selectedFile.mime_type}</p>
            <p className="text-sm">Size: {selectedFile.size} bytes</p>
          </div>
        )}
      </div>
    </div>
  );
}

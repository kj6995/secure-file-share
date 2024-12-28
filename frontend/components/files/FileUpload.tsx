'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, File } from 'lucide-react';
import { EncryptionService } from '@/lib/services/encryptionService';
import { FileService } from '@/lib/services/fileService';
import { useFiles } from '@/lib/contexts/FileContext';

// Supported file types
const SUPPORTED_FILE_TYPES = {
  'text/plain': true,
  'text/csv': true,
  'application/json': true,
  'image/png': true,
  'image/jpeg': true,
  'image/gif': true,
  'application/pdf': true,
  'video/mp4': true,
  'video/x-msvideo': true,
  'audio/mpeg': true,
  'audio/wav': true,
} as const;

type SupportedMimeTypes = keyof typeof SUPPORTED_FILE_TYPES;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export function FileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { refreshFiles } = useFiles();
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File) => {
    // Check file type
    if (!SUPPORTED_FILE_TYPES[file.type as SupportedMimeTypes]) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Please upload only supported file types: Text (TXT, CSV, JSON), Images (PNG, JPEG, GIF), PDF, Video (MP4, AVI), or Audio (MP3, WAV)',
      });
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum file size allowed is 5MB',
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      // Reset the file input
      event.target.value = '';
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      console.log('Starting file upload process:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Show encryption started toast
      toast({
        title: 'Encrypting file',
        description: 'Please wait while we encrypt your file...',
      });

      // Encrypt the file
      console.log('Starting file encryption...');
      const { encryptedFile, encryptedKey } = await EncryptionService.encryptFile(file);
      console.log('File encrypted:', {
        originalSize: file.size,
        encryptedSize: encryptedFile.size,
      });

      // Verify the encryption key is valid base64
      try {
        const decodedKey = atob(encryptedKey);
        console.log('Encryption key is valid base64, length:', decodedKey.length);
      } catch (e) {
        console.error('Invalid base64 key:', encryptedKey);
        throw new Error('Generated encryption key is not valid base64');
      }

      // Show upload started toast
      toast({
        title: 'Uploading file',
        description: 'Your encrypted file is being uploaded...',
      });

      // Upload the encrypted file
      console.log('Uploading encrypted file...');
      await FileService.uploadFile(encryptedFile, file.name, encryptedKey);
      console.log('File upload complete');

      // Test decryption immediately after upload
      if (process.env.NODE_ENV === 'development') {
        try {
          console.log('Testing decryption with same key...');
          const arrayBuffer = await encryptedFile.arrayBuffer();
          const decryptedData = await EncryptionService.decryptFile(arrayBuffer, encryptedKey);
          
          // Create blob for size comparison
          const decryptedBlob = new Blob([decryptedData], { type: file.type });
          console.log('Test decryption successful:', {
            decryptedSize: decryptedBlob.size,
            decryptedType: decryptedBlob.type,
            originalSize: file.size,
            originalType: file.type
          });
        } catch (decryptError) {
          console.error('Test decryption failed:', decryptError);
          throw new Error('File encryption verification failed');
        }
      }

      // Refresh the file list
      await refreshFiles();

      // Show success toast
      toast({
        title: 'Success',
        description: 'File encrypted and uploaded successfully!',
      });

      // Reset the file input
      event.target.value = '';
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to upload file',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!validateFile(file)) return;

    // Create a new FileList-like object
    const dt = new DataTransfer();
    dt.items.add(file);

    // Create a fake input event
    const input = document.getElementById('file-upload') as HTMLInputElement;
    if (input) {
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* File Upload Area - Takes 2/3 of the space */}
      <div className="md:col-span-2">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center h-full ${
            dragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-3 h-full">
            <UploadCloud className="h-10 w-10 text-gray-400" />
            <div className="flex flex-col space-y-1 text-sm text-gray-500">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary/80"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </label>
              <p>or drag and drop</p>
            </div>
          </div>
        </div>
      </div>

      {/* Supported File Types - Takes 1/3 of the space */}
      <div className="text-sm text-gray-500 space-y-1">
        <p className="font-medium">Supported file types:</p>
        <ul className="list-disc list-inside space-y-0.5 pl-2">
          <li>Image Files: PNG, JPEG, GIF</li>
          <li>Text Files: TXT, CSV, JSON</li>
          <li>Audio Files: MP3, WAV</li>
          <li>Video Files: MP4, AVI</li>
          <li>PDF Files: PDF</li>
        </ul>
        <p className="text-xs mt-1">Maximum file size: 5MB</p>
      </div>

      {/* Upload Progress - Full width */}
      {isUploading && (
        <div className="space-y-2 md:col-span-3">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-gray-500 text-center">
            {uploadProgress}% uploaded
          </p>
        </div>
      )}
    </div>
  );
}

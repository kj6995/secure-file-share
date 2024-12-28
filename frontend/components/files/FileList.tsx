'use client';

import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Trash2, Share2, File as FileIcon } from 'lucide-react';
import { FileService, FileMetadata } from '@/lib/services/fileService';
import { useFiles } from '@/lib/contexts/FileContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { ShareDialog } from './ShareDialog';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EncryptionService } from '@/lib/services/encryptionService';

const ITEMS_PER_PAGE = 10;

export function FileList() {
  const { toast } = useToast();
  const { files, refreshFiles, isLoading, setSelectedFile, selectedFile } = useFiles();
  const auth = useSelector((state: RootState) => state.auth);
  const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentFiles = files.slice(startIndex, endIndex);

  const handleDownload = async (file: FileMetadata) => {
    try {
      setDownloadingFile(file.id);
      const { encryptedFile, encryptedKey } = await FileService.downloadFile(file.id);
      
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await encryptedFile.arrayBuffer();
      
      // Decrypt the file
      const decryptedData = await EncryptionService.decryptFile(arrayBuffer, encryptedKey);
      
      // Create a download link
      const decryptedBlob = new Blob([decryptedData], { type: file.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'File downloaded successfully',
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to download file',
      });
    } finally {
      setDownloadingFile(null);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      await FileService.deleteFile(fileId);
      await refreshFiles();
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete file',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No files uploaded yet
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="rounded-md border flex-1 overflow-hidden">
        <div className="h-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Size</TableHead>
                <TableHead className="px-4">Uploaded</TableHead>
                <TableHead className="px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentFiles.map((file) => (
                <TableRow 
                  key={file.id}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    selectedFile?.id === file.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    // Only set selected file if it's different from current selection
                    if (selectedFile?.id !== file.id) {
                      setSelectedFile(file);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-start gap-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      <div className="min-w-0">
                        <span className="break-words whitespace-normal">{file.filename}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>{new Date(file.uploaded_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                        disabled={downloadingFile === file.id}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <ShareDialog file={file} />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileToDelete(file);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{fileToDelete?.filename}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (fileToDelete) {
                  await deleteFile(fileToDelete.id);
                  setIsDeleteDialogOpen(false);
                  setFileToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

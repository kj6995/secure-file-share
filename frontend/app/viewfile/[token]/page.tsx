"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShareService,
  SharedFileResponse,
} from "@/lib/services/shareService";
import { ApiError } from "@/types/api";
import { EncryptionService } from "@/lib/services/encryptionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileIcon, Calendar, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { FilePreview } from "@/components/files/FilePreview";
import { useAppSelector } from "@/lib/store/store";

interface ErrorState {
  title: string;
  message: string;
}

export default function ViewFilePage() {
  const { token } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, isInitialized } = useAppSelector(
    (state) => state.auth
  );
  const [fileData, setFileData] = useState<SharedFileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Validate token type early
  const validToken = typeof token === 'string' ? token : null;

  const loadSharedFile = useCallback(async () => {
    try {
      if (!validToken) {
        throw { error: "Error", message: "Invalid token" };
      }
      const data = await ShareService.getSharedFile(validToken);
      setFileData(data);
      setError(null);
    } catch (error: any) {
      console.log("Error loading shared file:", error);
      setFileData(null);

      setError({
        title: error.error || "Error",
        message: error.message || "Failed to load file",
      });

      toast({
        variant: "destructive",
        title: error.error || "Error",
        description: error.message || "Failed to load file",
      });
    } finally {
      setIsLoading(false);
    }
  }, [validToken, toast]);

  useEffect(() => {
    // Wait for auth to be initialized
    if (!isInitialized) {
      return;
    }
    
    if (!authLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      router.push(`/auth?redirect_uri=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Only load if we're authenticated and have a token
    if (isAuthenticated && validToken) {
      setIsLoading(true);
      loadSharedFile();
    }
  }, [isInitialized, isAuthenticated, validToken, authLoading, router, loadSharedFile]);

  const handleDownload = async () => {
    if (!validToken || !fileData) return;

    try {
      setIsDownloading(true);
      const { encryptedFile, encryptedKey } = await ShareService.downloadSharedFile(validToken);

      // Convert Blob to ArrayBuffer
      const arrayBuffer = await encryptedFile.arrayBuffer();

      // Decrypt the file before downloading
      const decryptedData = await EncryptionService.decryptFile(arrayBuffer, encryptedKey);
      
      // Create a download link
      const decryptedBlob = new Blob([decryptedData], { 
        type: fileData.mime_type || 'application/octet-stream' 
      });
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Failed to download file",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !fileData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              {error?.title || "Error"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error?.message || "Failed to load file"}
            </p>
            {!isAuthenticated && (
              <Button
                className="mt-4"
                onClick={() => {
                  const currentPath = window.location.pathname;
                  router.push(
                    `/auth?redirect_uri=${encodeURIComponent(currentPath)}`
                  );
                }}
              >
                Login to View File
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-7rem)]">
        {/* Left Column - File Info */}
        <div className="col-span-12 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileIcon className="h-6 w-6" />
                {fileData.filename}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>
                    {fileData.permissions === "download"
                      ? "View and Download"
                      : "View Only"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4" />
                  <span>
                    {fileData.size} bytes • {fileData.mime_type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Shared by {fileData.shared_by || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Shared on {new Date(fileData.created_at).toLocaleDateString()}
                  </span>
                </div>

                {fileData.permissions === "download" && (
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full"
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="col-span-12 lg:col-span-8 h-full">
          <Card className="h-full flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              <FilePreview
                selectedFile={fileData ? {
                  filename: fileData.filename,
                  mime_type: fileData.mime_type,
                  size: fileData.size,
                } : null}
                downloadMethod={
                  validToken && fileData
                    ? async () => {
                        const result = await ShareService.downloadSharedFile(validToken);
                        return {
                          encryptedFile: result.encryptedFile,
                          encryptedKey: result.encryptedKey
                        };
                      }
                    : undefined
                }
                className="flex-1 min-h-0 overflow-auto"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

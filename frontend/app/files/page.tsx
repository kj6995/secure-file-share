"use client";

import { FileUpload } from "@/components/files/FileUpload";
import { FileList } from "@/components/files/FileList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileProvider } from "@/lib/contexts/FileContext";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePreview } from "@/components/files/FilePreview";
import { useFiles } from "@/lib/contexts/FileContext";
import { FileService } from "@/lib/services/fileService";

export default function FilesPage() {
  const auth = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if we're on the client side
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("accessToken");
    const authData = localStorage.getItem("auth");

    // Only redirect if there's no token or auth data in localStorage
    if (!token || !authData) {
      console.log("Files page - No auth data found, redirecting to auth");
      router.push("/auth");
      return;
    }

    // Don't check Redux state here as it might not be initialized yet
  }, [mounted, router]);

  // Show loading state while mounting
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Once mounted, render content if we have tokens (Redux state will catch up)
  return (
    <FileProvider>
      <FilesContent />
    </FileProvider>
  );
}

function FilesContent() {
  const { selectedFile } = useFiles();

  return (
    <div className="mx-auto px-4 grid grid-cols-12 gap-6 min-h-[calc(100vh-7rem)]">
      {/* Left Column */}
      <div className="col-span-12 lg:col-span-8 h-full">
        <h3 className="text-2xl font-bold mb-6 leading-[2.5rem]">View Your Files</h3>
        <div className="flex flex-col h-[calc(100%-4rem)] gap-6">
          <div className="flex-none">
            <FileUpload />
          </div>
          <div className="flex-1 min-h-0 h-full">
            <FileList />
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="col-span-12 lg:col-span-4 h-full">
        <Card className="h-full flex flex-col sticky top-0">
          <div className="flex-1 min-h-0 overflow-auto">
            <FilePreview
              selectedFile={selectedFile}
              downloadMethod={
                selectedFile
                  ? async () => {
                      const result = await FileService.downloadFile(selectedFile.id);
                      return {
                        encryptedFile: result.encryptedFile,
                        encryptedKey: result.encryptedKey
                      };
                    }
                  : undefined
              }
              className="flex-1 min-h-0"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

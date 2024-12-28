'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Upload, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [showHomeUI, setShowHomeUI] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    const authData = localStorage.getItem('auth');

    if (token && authData) {
      // User is logged in, redirect to /files
      router.push('/files');
      return;
    }

    // User is not logged in, show the home page UI
    setShowHomeUI(true);
  }, [router]);

  // Show loading state while checking authentication
  if (!showHomeUI) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Secure File Sharing Platform
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Share files securely with end-to-end encryption, granular access controls,
            and advanced security features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="p-6">
            <Shield className="w-12 h-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">End-to-End Encryption</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Your files are encrypted before upload and only decrypted by authorized recipients.
            </p>
          </Card>

          <Card className="p-6">
            <Upload className="w-12 h-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Secure File Upload</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Upload files of any size with automatic encryption and secure storage.
            </p>
          </Card>

          <Card className="p-6">
            <Share2 className="w-12 h-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Controlled Sharing</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Share files with specific users or generate time-limited access links.
            </p>
          </Card>
        </div>

        <div className="text-center">
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/auth">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth?tab=register">Register</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

function AuthContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    // Set initial tab based on URL parameter, default to 'login'
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  );
  const [showAuthUI, setShowAuthUI] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('accessToken');
    const authData = localStorage.getItem('auth');

    if (token && authData) {
      // Get redirect URI if present
      const redirectUri = searchParams.get('redirect_uri');
      console.log('Auth page - User already logged in, redirecting to:', redirectUri || '/');
      
      // Redirect to the specified URI or home
      router.push(redirectUri || '/');
      return;
    }

    // Only show auth UI if user is not logged in
    setShowAuthUI(true);
  }, [searchParams, router]);

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: message,
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register' || tab === 'login') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Show loading state by default until we confirm user is not logged in
  if (!showAuthUI) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Suspense fallback={
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      }>
        <AuthContent />
      </Suspense>
    </div>
  );
}

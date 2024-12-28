'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store/store';
// import { enableMfa } from '@/lib/store/features/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
// import QRCode from 'react-qr-code';
import { useToast } from '@/components/ui/use-toast';

export function MFASetup() {
  // const [qrUri, setQrUri] = useState('');
  // const [secret, setSecret] = useState('');
  // const dispatch = useDispatch<AppDispatch>();
  // const { isLoading } = useSelector((state: RootState) => state.auth);
  // const { toast } = useToast();

  // const handleEnableMFA = async () => {
  //   const result = await dispatch(enableMfa());
    
  //   if (enableMfa.fulfilled.match(result)) {
  //     setQrUri(result.payload.uri);
  //     setSecret(result.payload.secret);
  //     toast({
  //       title: "Success",
  //       description: "MFA setup initiated. Scan the QR code with your authenticator app.",
  //     });
  //   } else if (enableMfa.rejected.match(result)) {
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: result.payload as string,
  //     });
  //   }
  // };

  return (
    <Card className="w-[350px]">
      {/* <CardHeader>
        <CardTitle>Setup MFA</CardTitle>
        <CardDescription>
          Enable two-factor authentication for enhanced security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qrUri ? (
          <Button 
            onClick={handleEnableMFA} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Enable MFA'}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <QRCode value={qrUri} />
            </div>
            <div className="space-y-2">
              <Label>Secret Key</Label>
              <Input value={secret} readOnly />
              <p className="text-sm text-gray-500">
                If you cannot scan the QR code, you can manually enter this secret key in your authenticator app.
              </p>
            </div>
          </div>
        )}
      </CardContent> */}
    </Card>
  );
}

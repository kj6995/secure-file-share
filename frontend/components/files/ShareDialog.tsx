'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FileMetadata } from '@/lib/services/fileService';
import { ShareService } from '@/lib/services/shareService';
import { UserService, GuestUser } from '@/lib/services/userService';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Share2 } from 'lucide-react';

const shareFormSchema = z.object({
  permissions: z.enum(['view', 'download'], {
    required_error: 'Please select permissions for the shared link.',
  }),
  expiresIn: z.string().min(1, {
    message: 'Please select when the link should expire.',
  }),
  guestUserId: z.string().nullable(),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

const defaultValues: Partial<ShareFormValues> = {
  permissions: 'view',
  expiresIn: '24',
  guestUserId: null,
};

interface ShareDialogProps {
  file: FileMetadata;
}

export function ShareDialog({ file }: ShareDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [guestUsers, setGuestUsers] = useState<GuestUser[]>([]);

  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues,
  });

  // Fetch guest users when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchGuestUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const users = await UserService.getGuestUsers();
          console.log('Fetched guest users:', users);
          setGuestUsers(users);
        } catch (error) {
          console.error('Failed to fetch guest users:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load guest users',
          });
          setGuestUsers([]);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchGuestUsers();
    } else {
      // Reset state when dialog closes
      setGuestUsers([]);
      setGeneratedLink(null);
    }
  }, [isOpen, toast]);

  const formatUserDisplay = (user: GuestUser): string => {
    // If both first and last name are present and not empty
    if (user.first_name?.trim() && user.last_name?.trim()) {
      return `${user.first_name.trim()} ${user.last_name.trim()} (${user.email})`;
    }
    // If only first name is present and not empty
    if (user.first_name?.trim()) {
      return `${user.first_name.trim()} (${user.email})`;
    }
    // If only last name is present and not empty
    if (user.last_name?.trim()) {
      return `${user.last_name.trim()} (${user.email})`;
    }
    // Default to just email
    return user.email;
  };

  async function onSubmit(data: ShareFormValues) {
    setIsLoading(true);
    try {
      const response = await ShareService.generateShareableLink(file.id, {
        permissions: data.permissions,
        expiresIn: parseInt(data.expiresIn),
        guestUserId: data.guestUserId && data.guestUserId !== 'none' ? parseInt(data.guestUserId) : undefined,
      });

      const shareableUrl = `${window.location.origin}/viewfile/${response.token}`;
      setGeneratedLink(shareableUrl);
      toast({
        title: 'Success',
        description: 'Shareable link generated successfully',
      });
    } catch (error) {
      console.error('Failed to generate shareable link:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate shareable link',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        toast({
          title: 'Success',
          description: 'Link copied to clipboard',
        });
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to copy link',
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Share2 className="mr-2 h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Share your file &quot;{file.filename}&quot; securely with others.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="guestUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Share With (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || "none"}
                    disabled={isLoadingUsers}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select a guest user"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Anyone with the link</SelectItem>
                      {Array.isArray(guestUsers) && guestUsers.length > 0 ? (
                        guestUsers.map((user) => (
                          <SelectItem 
                            key={user.id} 
                            value={String(user.id)}
                            title={user.email} // Add tooltip with email
                          >
                            {formatUserDisplay(user)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-users" disabled>
                          {isLoadingUsers ? 'Loading guest users...' : 'No guest users available'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a specific guest user or select &quot;Anyone with the link&quot; for a public link
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select permissions" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="download">Download</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiresIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires In</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expiration time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                      <SelectItem value="720">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              {generatedLink ? (
                <>
                  <Input value={generatedLink} readOnly />
                  <Button type="button" onClick={copyToClipboard}>
                    Copy
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Link'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

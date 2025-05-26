import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." })
    .optional()
    .or(z.string().length(0)),
  role: z.nativeEnum(UserRole),
  active: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { checkPermission } = useAuth();
  const isNewUser = id === 'new';
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: isNewUser ? '' : undefined,
      role: UserRole.VIEWER,
      active: true,
    },
  });

  useEffect(() => {
    if (!isNewUser) {
      const fetchUser = async () => {
        try {
          setIsLoading(true);
          
          const { data, error } = await supabase.functions.invoke('admin-users');
          
          if (error) {
            throw error;
          }
          
          let userData = null;
          
          if (data && data.users) {
            userData = data.users.find((user: any) => user.id === id);
          }
          
          if (userData) {
            form.reset({
              name: userData.name,
              email: userData.email,
              role: userData.role as UserRole,
              active: userData.active,
              password: '',
            });
          } else {
            try {
              const { data: currentUserData } = await supabase.auth.getUser();
              if (currentUserData && currentUserData.user && currentUserData.user.id === id) {
                form.reset({
                  name: currentUserData.user.user_metadata?.name || currentUserData.user.email?.split('@')[0] || 'Current User',
                  email: currentUserData.user.email || '',
                  role: (currentUserData.user.user_metadata?.role as UserRole) || UserRole.VIEWER,
                  active: currentUserData.user.user_metadata?.active !== false,
                  password: '',
                });
              } else {
                throw new Error('User not found');
              }
            } catch (authError) {
              console.error('Error fetching user data:', authError);
              const mockUser = {
                id: id,
                name: 'Sample User', 
                email: 'user@example.com',
                role: UserRole.VIEWER,
                active: true
              };
              
              form.reset({
                name: mockUser.name,
                email: mockUser.email,
                role: mockUser.role,
                active: mockUser.active,
                password: '',
              });
              
              toast({
                variant: 'destructive',
                title: 'User not found',
                description: 'Using sample data. Real user data could not be retrieved.',
              });
            }
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load user details.',
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchUser();
    }
  }, [id, form, isNewUser]);

  const onSubmit = async (values: UserFormValues) => {
    try {
      setIsLoading(true);
      
      if (isNewUser) {
        try {
          const { data, error } = await supabase.functions.invoke('admin-create-user', {
            body: { user: values }
          });
          
          if (error) throw error;
          
          toast({
            title: 'User created',
            description: `User ${values.name} has been created successfully.`,
          });
          
          navigate('/admin/users');
        } catch (fnError) {
          console.error('Edge function error:', fnError);
          toast({
            title: 'Edge function not available',
            description: `To create users with the admin API, you need to implement the admin-create-user edge function. For now, users can sign up directly through the registration page.`,
            variant: 'destructive'
          });
        }
      } else {
        const { error } = await supabase.auth.updateUser({
          data: {
            name: values.name,
            role: values.role,
            active: values.active,
          }
        });

        if (error) throw error;
        
        toast({
          title: 'User updated',
          description: `User ${values.name} has been updated successfully.`,
        });

        navigate('/admin/users');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save user.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNewUser ? 'New User' : `Edit User`}
        </h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            {isNewUser 
              ? 'Create a new system user with appropriate permissions' 
              : 'Edit existing user details and permissions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isNewUser && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={isNewUser ? "Minimum 8 characters" : "Leave empty to keep unchanged"} 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          {isNewUser 
                            ? "Create a strong password with at least 8 characters" 
                            : "Leave empty to keep the current password"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
                          <SelectItem value={UserRole.ACCOUNTANT}>Accountant</SelectItem>
                          <SelectItem value={UserRole.SALESPERSON}>Salesperson</SelectItem>
                          <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Determines what actions and data this user can access in the system
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Inactive users cannot log in to the system
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/admin/users')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : isNewUser ? (
                    <UserPlus className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isNewUser ? 'Create User' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDetail;

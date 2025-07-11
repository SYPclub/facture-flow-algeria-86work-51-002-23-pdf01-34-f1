import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Search, Plus, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { User } from '@/types';
import { mapSupabaseAuthUserToDomainUser } from '@/utils/supabaseHelpers';

const UsersPage = () => {
  const { checkPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        
        // Fetch users from our Edge Function that uses the service role key
        const { data, error } = await supabase.functions.invoke('admin-users');
        
        if (error) {
          throw error;
        }
        
        if (data && data.users) {
          setUsers(data.users);
          toast({
            title: 'Users loaded',
            description: 'Successfully loaded users from the system',
          });
        } else {
          throw new Error('Invalid response from admin-users function');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load users. Check service role key configuration.',
        });
        
        // If Edge Function fails, get current user at minimum
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData && userData.user) {
            const currentUser = mapSupabaseAuthUserToDomainUser(userData.user);
            setUsers([currentUser]);
          } else {
            // Fallback to mock data if no user is available
            setUsers([
              { id: '1', name: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN, active: true, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
              { id: '2', name: 'Accountant User', email: 'accountant@example.com', role: UserRole.ACCOUNTANT, active: true, createdAt: '2023-01-02', updatedAt: '2023-01-02' },
              { id: '3', name: 'Sales User', email: 'sales@example.com', role: UserRole.SALESPERSON, active: true, createdAt: '2023-01-03', updatedAt: '2023-01-03' },
              { id: '4', name: 'Viewer User', email: 'viewer@example.com', role: UserRole.VIEWER, active: true, createdAt: '2023-01-04', updatedAt: '2023-01-04' },
              { id: '5', name: 'Inactive User', email: 'inactive@example.com', role: UserRole.VIEWER, active: false, createdAt: '2023-01-05', updatedAt: '2023-01-05' },
            ]);
          }
        } catch (authError) {
          console.error('Error fetching current user:', authError);
          // Keep the mock data
          setUsers([
            { id: '1', name: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN, active: true, createdAt: '2023-01-01', updatedAt: '2023-01-01' },
            { id: '2', name: 'Accountant User', email: 'accountant@example.com', role: UserRole.ACCOUNTANT, active: true, createdAt: '2023-01-02', updatedAt: '2023-01-02' },
            { id: '3', name: 'Sales User', email: 'sales@example.com', role: UserRole.SALESPERSON, active: true, createdAt: '2023-01-03', updatedAt: '2023-01-03' },
            { id: '4', name: 'Viewer User', email: 'viewer@example.com', role: UserRole.VIEWER, active: true, createdAt: '2023-01-04', updatedAt: '2023-01-04' },
            { id: '5', name: 'Inactive User', email: 'inactive@example.com', role: UserRole.VIEWER, active: false, createdAt: '2023-01-05', updatedAt: '2023-01-05' },
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });
  
  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'default';
      case UserRole.ACCOUNTANT:
        return 'secondary';
      case UserRole.SALESPERSON:
        return 'outline';
      case UserRole.VIEWER:
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérer l'accès et les autorisations des utilisateurs.
          </p>
        </div>
        
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs du système</CardTitle>
          <CardDescription>
            Gérer l'accès et les autorisations des utilisateurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                Loading users...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                No users found matching your search
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'destructive'}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                        >
                          Modifier l'utilisateur
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;

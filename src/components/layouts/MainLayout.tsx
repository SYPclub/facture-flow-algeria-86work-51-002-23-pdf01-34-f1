
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { 
  FileText, 
  Users, 
  Package, 
  Truck, 
  FileSpreadsheet, 
  UserCog, 
  Home, 
  LogOut, 
  Building,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const AppSidebar = () => {
  const { user, logout, checkPermission } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  const menuItems = [
    {
      title: 'Tableau de bord',
      url: '/',
      icon: Home,
      allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER]
    },
    {
      title: 'Factures',
      icon: FileText,
      allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER],
      items: [
        {
          title: 'Factures pro forma',
          url: '/invoices/proforma',
          allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER]
        },
        {
          title: 'Factures finales',
          url: '/invoices/final',
          allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.VIEWER]
        }
      ]
    },
    {
      title: 'bon de livraison',
      url: '/delivery-notes',
      icon: Truck,
      allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER]
    },
    {
      title: 'Clients',
      url: '/clients',
      icon: Users,
      allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON, UserRole.VIEWER]
    },
    {
      title: 'Produits',
      url: '/products',
      icon: Package,
      allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.VIEWER]
    },
    {
      title: 'État 104',
      url: '/reports/etat104',
      icon: FileSpreadsheet,
      allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.VIEWER]
    },
    {
      title: 'créances',
      url: '/reports/clients-debt',
      icon: FileSpreadsheet,
      allowedRoles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.VIEWER]
    },
    {
      title: 'Administrateur',
      icon: UserCog,
      allowedRoles: [UserRole.ADMIN],
      items: [
        {
          title: 'Utilisateurs',
          url: '/admin/users',
          allowedRoles: [UserRole.ADMIN]
        },
        {
          title: 'Informations sur l\'entreprise',
          url: '/admin/company-info',
          allowedRoles: [UserRole.ADMIN]
        }
      ]
    }
  ];

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar variant="sidebar" className="border-r">
      <SidebarHeader>
        <div className="flex h-16 items-center px-4">
          <h2 className={cn(
            "text-xl font-bold text-primary transition-opacity duration-200",
            state === "collapsed" && "opacity-0"
          )}>
            FactureFlow
          </h2>
          {state === "collapsed" && (
            <FileText className="h-6 w-6 text-primary mx-auto" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => {
              if (!checkPermission(item.allowedRoles)) return null;

              if (item.items) {
                const hasActiveChild = item.items.some(child => 
                  child.url && isActive(child.url)
                );

                return (
                  <Collapsible key={item.title} defaultOpen={hasActiveChild}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => {
                            if (!checkPermission(subItem.allowedRoles)) return null;
                            
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton 
                                  asChild 
                                  isActive={subItem.url ? isActive(subItem.url) : false}
                                >
                                  <Link to={subItem.url || '#'}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              }

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={item.url ? isActive(item.url) : false}
                  >
                    <Link to={item.url || '#'}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {state === "expanded" && (
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-muted-foreground hover:text-foreground"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

const MainLayout = () => {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 shadow-sm">
            <SidebarTrigger className="mr-2" />
            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm font-medium">
                {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;

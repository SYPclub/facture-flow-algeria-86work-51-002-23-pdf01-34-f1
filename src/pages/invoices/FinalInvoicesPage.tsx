
import React, { useState, useEffect } from 'react';
import { getUserEmailsById } from '@/utils/supabaseHelpers';
import { getUserEmailById } from '@/utils/supabaseHelpers';

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { mockDataService } from '@/services/mockDataService';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { FileText, ChevronDown, Plus, Search, Truck, User } from 'lucide-react';
import NewFinalInvoiceButton from '@/components/invoices/NewFinalInvoiceButton';

const FinalInvoicesPage = () => {
  const { checkPermission, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [creatorEmails, setCreatorEmails] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: finalInvoices = [], isLoading, error } = useQuery({
    queryKey: ['finalInvoices'],
    queryFn: () => mockDataService.getFinalInvoices(),
  });

  useEffect(() => {
    const fetchCreatorEmails = async () => {
      if (finalInvoices.length === 0) return;
      
      // Get unique user IDs from notes
      const userIds = [...new Set(finalInvoices
        .filter(invoice => invoice.created_by_userid)
        .map(invoice => invoice.created_by_userid))];
      if (userIds.length === 0) return;
      
      // Fetch emails for all creators at once
      const emailsMap = await getUserEmailsById(userIds);
      setCreatorEmails(emailsMap);
    };
    
    fetchCreatorEmails();
  }, [finalInvoices]);

  // Filter invoices based on search query and status filter
  const filteredInvoices = finalInvoices.filter((invoice) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      invoice.number.toLowerCase().includes(query) ||
      (invoice.client?.name?.toLowerCase().includes(query) || '') ||
      (invoice.notes?.toLowerCase().includes(query) || '');
      
    const matchesStatus = statusFilter ? invoice.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  // Sort invoices
  const sortedInvoices = [...filteredInvoices]
    .sort((b, a) => new Date(b.createdat) > new Date(a.createdat) ? 1 : -1);

  // Calculate pagination
  const totalItems = sortedInvoices.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentInvoices = sortedInvoices.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'payé':
        return 'default';
      case 'NonPayé':
        return 'secondary';
      case 'annulé':
        return 'destructive';
      case 'credited':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', { 
      style: 'currency', 
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  // Check if a delivery note can be created for this invoice
  const canCreateDeliveryNote = (invoiceId: string) => {
    // This would normally check if a delivery note already exists for this invoice
    // For demo purposes we're just returning true for all NonPayé/payé invoices
    const invoice = finalInvoices.find(i => i.id === invoiceId);
    return invoice && ['NonPayé', 'payé'].includes(invoice.status);
  };

  // Check if document is owned by current user
  const isOwnedByCurrentUser = (invoice: any) => {
    return invoice.created_by_userid === user?.id;
  };

  // Get creator email display
  const getCreatorEmailDisplay = (invoice: any) => {
    const userId = invoice.created_by_userid;
    
    if (!userId) return 'Unknown User';
    
    return creatorEmails[userId] || 'Loading...';
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Factures finales</h1>
          <p className="text-muted-foreground">
            Gérer vos factures formelles
          </p>
        </div>
        <NewFinalInvoiceButton />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Liste des factures finales</CardTitle>
            <CardDescription>Factures formelles émises aux clients</CardDescription>
          </div>
          <div className="mt-4 sm:mt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {statusFilter ? `Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}` : 'Filter by Status'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>Tous</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('NonPayé')}>Non payé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('payé')}>Payé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('annulé')}>Annulé</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('credited')}>Crédité</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Recherche de factures..."
                className="max-w-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Afficher:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-red-500">Erreur de chargement des factures</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                {searchQuery || statusFilter
                  ? "Aucune facture ne correspond à vos critères"
                  : "Aucune facture finale n'a encore été émise"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créateur</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className={isOwnedByCurrentUser(invoice) ? "bg-muted/20" : ""}>
                        <TableCell className="font-mono font-medium">
                          {invoice.number}
                        </TableCell>
                        <TableCell>
                          {invoice.client?.name || 'Unknown Client'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {invoice.issuedate}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <span className={isOwnedByCurrentUser(invoice) ? "font-medium" : ""}>
                              {getCreatorEmailDisplay(invoice)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end space-x-2">
                            <Link 
                              to={`/invoices/final/${invoice.id}`}
                              className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                            >
                              View
                            </Link>
                            {canCreateDeliveryNote(invoice.id) && checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALESPERSON]) && (
                              <Link 
                                to={`/delivery-notes/new?invoiceId=${invoice.id}`}
                                className="flex items-center rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline"
                              >
                                <Truck className="mr-1 h-3 w-3" />
                                Delivery
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Affichage {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} résultats
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) handlePageChange(currentPage - 1);
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (totalPages <= 7) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(page);
                                }}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }

                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(page);
                                }}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }

                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }

                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) handlePageChange(currentPage + 1);
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinalInvoicesPage;

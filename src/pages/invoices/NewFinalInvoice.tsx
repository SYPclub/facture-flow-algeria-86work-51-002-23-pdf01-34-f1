import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { mockDataService } from '@/services/mockDataService';
import { createFinalInvoice } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Client, Product, FinalInvoice } from '@/types';
import { supabase } from '@/integrations/supabase/client';

const invoiceItemSchema = z.object({
  id: z.string(),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitprice: z.number().min(0, 'Unit price must be positive'),
  taxrate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  discount: z.number().min(0).max(100, 'Discount must be between 0 and 100'),
});

const finalInvoiceSchema = z.object({
  clientid: z.string().min(1, 'Client is required'),
  issuedate: z.string().min(1, 'Issue date is required'),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  payment_type: z.string().optional(),
  bc: z.string().optional(),
});

type FormData = z.infer<typeof finalInvoiceSchema>;

const NewFinalInvoice = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const proformaId = searchParams.get('proformaId');
  

  const calculateStampTax = (paymentType: string, subtotal: number) => {
    if (paymentType !== "cash") return 0;

    if (subtotal > 100000) {
      return subtotal * 0.02;
    } else if (subtotal > 30000) {
      return subtotal * 0.015;
    } else if (subtotal > 300) {
      return subtotal * 0.01;
    } else {
      return 0;
    }
  };

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockDataService.getClients(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => mockDataService.getProducts(),
  });

  const { data: sourceProforma } = useQuery({
    queryKey: ['proformaInvoice', proformaId],
    queryFn: () => mockDataService.getProformaInvoiceById(proformaId!),
    enabled: !!proformaId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(finalInvoiceSchema),
    defaultValues: {
      clientid: '',
      issuedate: new Date().toISOString().split('T')[0],
      notes: '',
      items: [],
      payment_type: '',
      bc: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (sourceProforma) {
      form.reset({
        clientid: sourceProforma.clientid,
        issuedate: new Date().toISOString().split('T')[0],
        notes: sourceProforma.notes || '',
        items: sourceProforma.items.map(item => ({
          id: uuidv4(),
          productId: item.productId,
          quantity: item.quantity,
          unitprice: item.unitprice,
          taxrate: item.taxrate,
          discount: item.discount,
        })),
        payment_type: sourceProforma.payment_type || '',
        bc: sourceProforma.bc || '',
      });
    }
  }, [sourceProforma, form]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const calculatedItems = data.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const totalExcl = item.quantity * item.unitprice * (1 - item.discount / 100);
        const totalTax = totalExcl * (item.taxrate / 100);
        const total = totalExcl + totalTax;

        return {
          id: item.id || uuidv4(),
          productId: item.productId,
          quantity: item.quantity,
          unitprice: item.unitprice,
          taxrate: item.taxrate,
          discount: item.discount,
          product,
          totalExcl,
          totalTax,
          total,
          unit: product?.unit || 'Unit',
        };
      });

      const subtotal = calculatedItems.reduce((sum, item) => sum + item.totalExcl, 0);
      const taxTotal = calculatedItems.reduce((sum, item) => sum + item.totalTax, 0);
      
      const stampTax = calculateStampTax(data.payment_type || '', subtotal);
      const total = subtotal + taxTotal + stampTax;

      // Generate invoice number using database function
      let invoiceNumber;
      try {
        const { data: generatedNumber, error: numberError } = await supabase
          .rpc('generate_invoice_number');
        
        if (numberError) {
          console.error('Error generating invoice number:', numberError);
          // Fallback to timestamp-based number if database function fails
          invoiceNumber = ` FIN-${Date.now()} (facture D'avoir)`;
        } else {
          invoiceNumber = ` ${generatedNumber} (facture D'avoir)`;
        }
      } catch (error) {
        console.error('Database function not available, using fallback:', error);
        invoiceNumber = ` FIN-${Date.now()} (facture D'avoir)`;
      }

      const invoiceId = uuidv4();
      const invoiceData: any = {
        id: invoiceId,
        number: invoiceNumber,
        clientid: data.clientid,
        issuedate: data.issuedate,
        notes: data.notes || '',
        subtotal,
        taxtotal: taxTotal,
        total,
        status: 'NonPayé',
        created_by_userid: user?.id || '',
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
        payment_type: data.payment_type,
        stamp_tax: stampTax,
        bc: data.bc,
        amount_paid: 0,
        client_debt: total,
        items: calculatedItems, // Add items to invoice data
      };

      // Create the invoice with items
      const result = await createFinalInvoice(invoiceData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finalInvoices'] });
      toast({
        title: 'Facture créée',
        description: 'La facture finale a été créée avec succès',
      });
      navigate('/invoices/final');
    },
    onError: (error) => {
      console.error('Error creating final invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de créer la facture finale',
      });
    },
  });

  const addItem = () => {
    append({
      id: uuidv4(),
      productId: '',
      quantity: 1,
      unitprice: 0,
      taxrate: 19,
      discount: 0,
    });
  };

  const updateItemProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.unitprice`, product.unitprice);
      form.setValue(`items.${index}.taxrate`, product.taxrate);
    }
  };

  const calculateItemTotal = (item: any) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return 0;
    
    const totalExcl = item.quantity * item.unitprice * (1 - item.discount / 100);
    const totalTax = totalExcl * (item.taxrate / 100);
    return totalExcl + totalTax;
  };

  const calculateTotals = () => {
    const items = form.watch('items');
    const paymentType = form.watch('payment_type');
    
    const subtotal = items.reduce((sum, item) => {
      const totalExcl = item.quantity * item.unitprice * (1 - item.discount / 100);
      return sum + totalExcl;
    }, 0);
    const taxTotal = items.reduce((sum, item) => {
      const totalExcl = item.quantity * item.unitprice * (1 - item.discount / 100);
      const tax = totalExcl * (item.taxrate / 100);
      return sum + tax;
    }, 0);
    
    const stampTax = calculateStampTax(paymentType, subtotal);
    const total = subtotal + taxTotal + stampTax;

    return { subtotal, taxTotal, stampTax, total };
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2
    });
  };

  const onSubmit = (data: FormData) => {
    createInvoiceMutation.mutate(data);
  };

  const { subtotal, taxTotal, stampTax, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/invoices/final">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div> 
          <h1 className="text-3xl font-bold tracking-tight">
            {proformaId ? 'Convertir en facture finale' : `Nouvelle facture D'avoir finale`}
          </h1>
          <p className="text-muted-foreground">
            {proformaId ? 'Créer une facture finale à partir du proforma' : 'Créer une nouvelle facture finale'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de paiement</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Type de paiement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Espèces</SelectItem>
                          <SelectItem value="cheque">Chèque</SelectItem>
                          <SelectItem value="transfer">Virement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issuedate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'émission</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bon de commande</FormLabel>
                      <FormControl>
                        <Input placeholder="Numéro BC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes additionnelles..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Articles</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un article
              </Button>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>TVA %</TableHead>
                      <TableHead>Remise %</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const item = form.watch(`items.${index}`);
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field }) => (
                                <Select
                                  onValueChange={(value) => updateItemProduct(index, value)}
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Produit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitprice`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.taxrate`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discount`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            {formatCurrency(calculateItemTotal(item))}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total (HT):</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA:</span>
                  <span>{formatCurrency(taxTotal)}</span>
                </div>
                {stampTax > 0 && (
                  <div className="flex justify-between">
                    <span>Droit de timbre :</span>
                    <span>{formatCurrency(stampTax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total (TTC):</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/invoices/final">Annuler</Link>
            </Button>
            <Button type="submit" disabled={createInvoiceMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createInvoiceMutation.isPending ? 'Création...' : 'Créer la facture'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewFinalInvoice;

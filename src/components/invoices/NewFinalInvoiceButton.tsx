
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth, UserRole } from '@/contexts/AuthContext';

const NewFinalInvoiceButton = () => {
  const { checkPermission } = useAuth();

  if (!checkPermission([UserRole.ADMIN, UserRole.ACCOUNTANT])) {
    return null;
  }

  return (
    <>
      <Button asChild>
        <Link to="/invoices/final/nnew">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle facture
        </Link>
      </Button>
      <Button asChild>
        <Link to="/invoices/final/new">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle facture D'avoir
        </Link>
      </Button>
    </>
  );
};

export default NewFinalInvoiceButton;


import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyInfo } from '@/types/company';

// Function to fetch company info from the database
export async function fetchCompanyInfo(): Promise<CompanyInfo | null> {
  try {
    const { data, error } = await supabase
      .from('company_info')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching company info:', error);
      return null;
    }
    
    if (data) {
      return {
        id: data.id,
        businessName: data.business_name,
        address: data.address,
        taxid: data.tax_id,
        commerceRegNumber: data.commerce_reg_number,
        phone: data.phone,
        email: data.email,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching company info:', error);
    return null;
  }
}

// Component to render company info (for future use in UI if needed)
const CompanyInfoHeader: React.FC<{ companyInfo: CompanyInfo }> = ({ companyInfo }) => {
  return (
    <div className="text-center mb-4">
      <h2 className="text-xl font-bold">{companyInfo.businessName}</h2>
      <p>{companyInfo.address}</p>
      <p>NIF: {companyInfo.taxid} | RC: {companyInfo.commerceRegNumber}</p>
      <p>Tel: {companyInfo.phone} | Email: {companyInfo.email}</p>
    </div>
  );
};

export default CompanyInfoHeader;

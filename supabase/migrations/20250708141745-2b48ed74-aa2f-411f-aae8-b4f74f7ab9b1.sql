
-- First, let's create a table to track deleted invoice numbers for reuse
CREATE TABLE IF NOT EXISTS public.deleted_invoice_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the deleted numbers table
ALTER TABLE public.deleted_invoice_numbers ENABLE ROW LEVEL SECURITY;

-- Create policy for deleted numbers
CREATE POLICY "Allow all operations for authenticated users on deleted_invoice_numbers" 
  ON public.deleted_invoice_numbers 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Update the generate_invoice_number function to reuse deleted numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  reused_number TEXT;
  next_val INTEGER;
BEGIN
  -- First, try to get a deleted number to reuse (oldest first)
  SELECT number INTO reused_number
  FROM deleted_invoice_numbers
  ORDER BY deleted_at ASC
  LIMIT 1;
  
  IF reused_number IS NOT NULL THEN
    -- Remove the reused number from deleted_invoice_numbers table
    DELETE FROM deleted_invoice_numbers WHERE number = reused_number;
    RETURN reused_number;
  ELSE
    -- No deleted number available, generate new one
    SELECT nextval('invoice_number_seq') INTO next_val;
    RETURN 'F-' || LPAD(next_val::TEXT, 4, '0');
  END IF;
END;
$function$;

-- Create a function to handle invoice deletion and track the number for reuse
CREATE OR REPLACE FUNCTION public.track_deleted_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Add the deleted invoice number to the reuse table
  INSERT INTO deleted_invoice_numbers (number) VALUES (OLD.number);
  RETURN OLD;
END;
$function$;

-- Create trigger to track deleted invoice numbers
DROP TRIGGER IF EXISTS track_deleted_invoice_number_trigger ON public.final_invoices;
CREATE TRIGGER track_deleted_invoice_number_trigger
  BEFORE DELETE ON public.final_invoices
  FOR EACH ROW
  EXECUTE FUNCTION track_deleted_invoice_number();

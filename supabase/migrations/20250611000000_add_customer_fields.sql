
-- Add new fields to customers table
ALTER TABLE public.customers 
ADD COLUMN business_name TEXT,
ADD COLUMN office_phone TEXT,
ADD COLUMN mobile_phone TEXT;

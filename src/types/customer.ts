
import { Tables } from '@/integrations/supabase/types';

export type Customer = Tables<'customers'> & {
  business_name?: string;
  office_phone?: string;
  mobile_phone?: string;
};

export interface CustomerFormData {
  name: string;
  business_name: string;
  email: string;
  phone: string;
  office_phone: string;
  mobile_phone: string;
  address: string;
}

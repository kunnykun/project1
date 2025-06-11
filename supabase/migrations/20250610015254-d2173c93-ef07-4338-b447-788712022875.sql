
-- Add next_service_date column to service_reports table
ALTER TABLE public.service_reports 
ADD COLUMN next_service_date DATE;

-- Add SMS notification tracking table
CREATE TABLE public.sms_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  service_report_id UUID REFERENCES public.service_reports(id),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for SMS notifications
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for SMS notifications (basic policy - can be adjusted based on auth requirements)
CREATE POLICY "Allow all operations on sms_notifications" 
  ON public.sms_notifications 
  FOR ALL 
  USING (true);

-- Update service_report_photos table to ensure proper ordering and multiple photos support
ALTER TABLE public.service_report_photos 
ALTER COLUMN order_index SET DEFAULT 0;

-- Add index for better performance on photo ordering
CREATE INDEX IF NOT EXISTS idx_service_report_photos_order 
ON public.service_report_photos(service_report_id, order_index);

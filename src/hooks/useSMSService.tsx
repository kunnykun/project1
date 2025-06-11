
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSMSService = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendServiceDueNotification = async (customerId: string, customerPhone: string, customerName: string, nextServiceDate: string) => {
    setLoading(true);
    
    try {
      const message = `Hi ${customerName}, this is Australian Vacuum Services. Your equipment service is due on ${new Date(nextServiceDate).toLocaleDateString()}. Please contact us to schedule your appointment. Thank you!`;
      
      // Send SMS via Twilio edge function
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: customerPhone,
          message: message
        }
      });

      if (smsError) {
        console.error('SMS sending error:', smsError);
        throw new Error(smsError.message || 'Failed to send SMS');
      }

      // Store the SMS notification in the database
      const { data, error } = await supabase
        .from('sms_notifications')
        .insert({
          customer_id: customerId,
          phone_number: customerPhone,
          message: message,
          status: smsResult?.success ? 'sent' : 'failed',
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "SMS Notification Sent",
        description: `Service reminder sent to ${customerName} at ${customerPhone}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error sending SMS notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS notification",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendCustomSMS = async (customerId: string, customerPhone: string, message: string) => {
    setLoading(true);
    
    try {
      // Send SMS via Twilio edge function
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: customerPhone,
          message: message
        }
      });

      if (smsError) {
        console.error('SMS sending error:', smsError);
        throw new Error(smsError.message || 'Failed to send SMS');
      }

      // Store the SMS notification in the database
      const { data, error } = await supabase
        .from('sms_notifications')
        .insert({
          customer_id: customerId,
          phone_number: customerPhone,
          message: message,
          status: smsResult?.success ? 'sent' : 'failed',
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "SMS Sent",
        description: `Message sent successfully to ${customerPhone}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error sending custom SMS:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendServiceDueNotification,
    sendCustomSMS,
    loading
  };
};

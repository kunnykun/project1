
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useReportActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateAndSendReport = async (reportId: string) => {
    setLoading(true);
    
    try {
      console.log('Generating and sending report for ID:', reportId);
      
      const { data, error } = await supabase.functions.invoke('generate-and-send-report', {
        body: { reportId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: "Service report has been generated and sent to the customer via email.",
        });
        return true;
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error: any) {
      console.error('Error generating and sending report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate and send report. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateAndSendReport,
    loading
  };
};

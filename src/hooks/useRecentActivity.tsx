
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  type: 'service_report' | 'customer';
  action: 'created' | 'updated' | 'drafted';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export const useRecentActivity = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      
      // Fetch recent service reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('service_reports')
        .select(`
          id,
          equipment_type,
          equipment_model,
          status,
          created_at,
          updated_at,
          customer:customers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reportsError) throw reportsError;

      // Fetch recent customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (customersError) throw customersError;

      const reportActivities: ActivityItem[] = (reportsData || []).map(report => ({
        id: report.id,
        type: 'service_report' as const,
        action: report.status === 'draft' ? 'drafted' : 'created',
        title: `Service Report ${report.status === 'draft' ? 'Drafted' : 'Created'}`,
        description: `${report.equipment_type}${report.equipment_model ? ` (${report.equipment_model})` : ''} for ${report.customer?.name}`,
        timestamp: report.created_at,
        status: report.status
      }));

      const customerActivities: ActivityItem[] = (customersData || []).map(customer => {
        const isNew = new Date(customer.created_at).getTime() === new Date(customer.updated_at).getTime();
        return {
          id: customer.id,
          type: 'customer' as const,
          action: isNew ? 'created' : 'updated',
          title: `Customer ${isNew ? 'Added' : 'Updated'}`,
          description: customer.name,
          timestamp: customer.updated_at
        };
      });

      // Combine and sort all activities by timestamp
      const allActivities = [...reportActivities, ...customerActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5); // Show only the 5 most recent activities

      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  return { activities, loading, refetchActivity: fetchRecentActivity };
};

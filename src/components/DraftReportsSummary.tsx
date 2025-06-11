
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DraftReport {
  id: string;
  equipment_type: string;
  equipment_model?: string;
  service_date: string;
  completion_date?: string;
  customer: {
    name: string;
  };
}

const DraftReportsSummary = () => {
  const [draftReports, setDraftReports] = useState<DraftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDraftReports();
  }, []);

  const fetchDraftReports = async () => {
    try {
      const { data, error } = await supabase
        .from('service_reports')
        .select(`
          id,
          equipment_type,
          equipment_model,
          service_date,
          completion_date,
          customer:customers(name)
        `)
        .eq('status', 'draft')
        .order('service_date', { ascending: true });

      if (error) throw error;
      setDraftReports(data || []);
    } catch (error) {
      console.error('Error fetching draft reports:', error);
      toast({
        title: "Error",
        description: "Failed to load draft reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilCompletion = (completionDate: string) => {
    const today = new Date();
    const completion = new Date(completionDate);
    const diffTime = completion.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCompletionStatus = (completionDate?: string) => {
    if (!completionDate) return { color: 'secondary', text: 'No deadline' };
    
    const days = getDaysUntilCompletion(completionDate);
    if (days < 0) return { color: 'destructive', text: `${Math.abs(days)} days overdue` };
    if (days === 0) return { color: 'destructive', text: 'Due today' };
    if (days <= 3) return { color: 'outline', text: `${days} days left` };
    return { color: 'secondary', text: `${days} days left` };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-orange-600" />
            Draft Service Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">Loading draft reports...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2 text-orange-600" />
          Draft Service Reports
          {draftReports.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {draftReports.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Service jobs that need to be finalized
        </CardDescription>
      </CardHeader>
      <CardContent>
        {draftReports.length === 0 ? (
          <p className="text-slate-600">No draft reports pending</p>
        ) : (
          <div className="space-y-3">
            {draftReports.map((report) => {
              const completionStatus = getCompletionStatus(report.completion_date);
              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      {report.customer.name} - {report.equipment_type}
                      {report.equipment_model && ` (${report.equipment_model})`}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      Service Date: {new Date(report.service_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {report.completion_date && (
                      <>
                        {completionStatus.color === 'destructive' && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant={completionStatus.color as any}>
                          {completionStatus.text}
                        </Badge>
                      </>
                    )}
                    {!report.completion_date && (
                      <Badge variant="secondary">No deadline</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DraftReportsSummary;

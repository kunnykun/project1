
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, FileText, Calendar, User, Wrench, Mail, CheckCircle, Trash2, Edit, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useReportActions } from '@/hooks/useReportActions';
import { useSMSService } from '@/hooks/useSMSService';
import ServiceReportDetail from './ServiceReportDetail';
import ServiceReportEdit from './ServiceReportEdit';

interface ServiceReport {
  id: string;
  equipment_type: string;
  equipment_model?: string;
  service_description: string;
  technician_name: string;
  service_date: string;
  next_service_date?: string;
  status: string;
  customer: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface ServiceReportListProps {
  onBack: () => void;
  onNewReport: () => void;
}

const ServiceReportList = ({ onBack, onNewReport }: ServiceReportListProps) => {
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingReport, setDeletingReport] = useState<string | null>(null);
  const { toast } = useToast();
  const { generateAndSendReport, loading: emailLoading } = useReportActions();
  const { sendServiceDueNotification, loading: smsLoading } = useSMSService();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('service_reports')
        .select(`
          *,
          customer:customers(id, name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load service reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReport = async (reportId: string) => {
    const success = await generateAndSendReport(reportId);
    if (success) {
      fetchReports();
    }
  };

  const handleSendSMSReminder = async (report: ServiceReport) => {
    if (!report.customer.phone) {
      toast({
        title: "Error",
        description: "Customer phone number not available",
        variant: "destructive",
      });
      return;
    }

    if (!report.next_service_date) {
      toast({
        title: "Error",
        description: "Next service date not set for this report",
        variant: "destructive",
      });
      return;
    }

    await sendServiceDueNotification(
      report.customer.id,
      report.customer.phone,
      report.customer.name,
      report.next_service_date
    );
  };

  const finalizeReport = async (reportId: string) => {
    setUpdatingStatus(reportId);
    try {
      const { error } = await supabase
        .from('service_reports')
        .update({ status: 'completed' })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report has been finalized and marked as completed",
      });
      
      fetchReports();
    } catch (error) {
      console.error('Error finalizing report:', error);
      toast({
        title: "Error",
        description: "Failed to finalize report",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const deleteReport = async (reportId: string) => {
    setDeletingReport(reportId);
    try {
      const { error: photosError } = await supabase
        .from('service_report_photos')
        .delete()
        .eq('service_report_id', reportId);

      if (photosError) throw photosError;

      const { error } = await supabase
        .from('service_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service report has been deleted",
      });
      
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete service report",
        variant: "destructive",
      });
    } finally {
      setDeletingReport(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'draft': return 'secondary';
      case 'in-progress': return 'outline';
      default: return 'secondary';
    }
  };

  // Show edit view if editing a report
  if (editingReportId) {
    return (
      <ServiceReportEdit
        reportId={editingReportId}
        onBack={() => setEditingReportId(null)}
        onSave={() => {
          setEditingReportId(null);
          fetchReports();
        }}
      />
    );
  }

  // Show report detail view if a report is selected
  if (selectedReportId) {
    return (
      <ServiceReportDetail
        reportId={selectedReportId}
        onBack={() => setSelectedReportId(null)}
      />
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading service reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-800">Service Reports</h2>
        </div>
        <Button onClick={onNewReport}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {report.equipment_type} {report.equipment_model && `- ${report.equipment_model}`}
                </CardTitle>
                <Badge variant={getStatusColor(report.status)}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Customer:</span>
                  <span>{report.customer.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Wrench className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Technician:</span>
                  <span>{report.technician_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Service Date:</span>
                  <span>{new Date(report.service_date).toLocaleDateString()}</span>
                </div>
              </div>
              
              {report.next_service_date && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Next Service Due:</span>
                    <span className="text-orange-600 font-medium">{new Date(report.next_service_date).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t border-slate-200">
                <p className="text-sm text-slate-600 font-medium mb-1">Service Description:</p>
                <p className="text-sm text-slate-800">{report.service_description}</p>
              </div>
              
              <div className="flex justify-between items-center flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedReportId(report.id)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                
                <div className="flex space-x-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingReportId(report.id)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  {report.status === 'draft' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => finalizeReport(report.id)}
                      disabled={updatingStatus === report.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {updatingStatus === report.id ? 'Finalizing...' : 'Finalize'}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSendReport(report.id)}
                    disabled={emailLoading}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {emailLoading ? 'Sending...' : 'Email Report'}
                  </Button>

                  {report.next_service_date && report.customer.phone && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendSMSReminder(report)}
                      disabled={smsLoading}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {smsLoading ? 'Sending...' : 'SMS Reminder'}
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={deletingReport === report.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingReport === report.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the service report
                          for {report.equipment_type} and remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteReport(report.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Report
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No service reports yet</h3>
            <p className="text-slate-600 mb-4">Create your first service report to get started.</p>
            <Button onClick={onNewReport}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceReportList;

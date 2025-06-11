
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, User, Wrench, FileText, Mail, CheckCircle, Edit, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useReportActions } from '@/hooks/useReportActions';
import { useSMSService } from '@/hooks/useSMSService';

interface ServiceReportDetailProps {
  reportId: string;
  onBack: () => void;
}

interface ServiceReport {
  id: string;
  equipment_type: string;
  equipment_model?: string;
  equipment_serial?: string;
  service_description: string;
  findings?: string;
  recommendations?: string;
  technician_name: string;
  service_date: string;
  next_service_date?: string;
  status: string;
  created_at: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  photos: Array<{
    photo_url: string;
    order_index: number;
    caption?: string;
  }>;
}

const ServiceReportDetail = ({ reportId, onBack }: ServiceReportDetailProps) => {
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { generateAndSendReport, loading: emailLoading } = useReportActions();
  const { sendServiceDueNotification, loading: smsLoading } = useSMSService();

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from('service_reports')
        .select(`
          *,
          customer:customers(id, name, email, phone, address),
          photos:service_report_photos(photo_url, order_index, caption)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;
      
      if (data.photos) {
        data.photos.sort((a, b) => a.order_index - b.order_index);
      }
      
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({
        title: "Error",
        description: "Failed to load report details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const finalizeReport = async () => {
    if (!report) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('service_reports')
        .update({ status: 'completed' })
        .eq('id', reportId);

      if (error) throw error;

      setReport({ ...report, status: 'completed' });
      toast({
        title: "Success",
        description: "Report has been finalized and marked as completed",
      });
    } catch (error) {
      console.error('Error finalizing report:', error);
      toast({
        title: "Error",
        description: "Failed to finalize report",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSendReport = async () => {
    const success = await generateAndSendReport(reportId);
    if (success && report?.status === 'draft') {
      await finalizeReport();
    }
  };

  const handleSendSMSReminder = async () => {
    if (!report?.customer.phone) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'draft': return 'secondary';
      case 'in-progress': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading report details...</div>;
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center">Report not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Service Report Details</h2>
            <p className="text-sm text-slate-600">Report ID: {report.id}</p>
          </div>
        </div>
        <Badge variant={getStatusColor(report.status)} className="text-sm">
          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-slate-700">Name:</span>
                <p className="text-slate-900">{report.customer.name}</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">Email:</span>
                <p className="text-slate-900">{report.customer.email}</p>
              </div>
              {report.customer.phone && (
                <div>
                  <span className="font-medium text-slate-700">Phone:</span>
                  <p className="text-slate-900">{report.customer.phone}</p>
                </div>
              )}
              {report.customer.address && (
                <div className="md:col-span-2">
                  <span className="font-medium text-slate-700">Address:</span>
                  <p className="text-slate-900">{report.customer.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-green-600" />
                Equipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-slate-700">Type:</span>
                <p className="text-slate-900">{report.equipment_type}</p>
              </div>
              {report.equipment_model && (
                <div>
                  <span className="font-medium text-slate-700">Model:</span>
                  <p className="text-slate-900">{report.equipment_model}</p>
                </div>
              )}
              {report.equipment_serial && (
                <div>
                  <span className="font-medium text-slate-700">Serial Number:</span>
                  <p className="text-slate-900">{report.equipment_serial}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-purple-600" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-slate-700">Technician:</span>
                  <p className="text-slate-900">{report.technician_name}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Service Date:</span>
                  <p className="text-slate-900">{new Date(report.service_date).toLocaleDateString()}</p>
                </div>
              </div>

              {report.next_service_date && (
                <div>
                  <span className="font-medium text-slate-700">Next Service Date:</span>
                  <p className="text-orange-600 font-medium">{new Date(report.next_service_date).toLocaleDateString()}</p>
                </div>
              )}
              
              <div>
                <span className="font-medium text-slate-700">Service Description:</span>
                <p className="text-slate-900 mt-1">{report.service_description}</p>
              </div>

              {report.findings && (
                <div>
                  <span className="font-medium text-slate-700">Findings:</span>
                  <p className="text-slate-900 mt-1">{report.findings}</p>
                </div>
              )}

              {report.recommendations && (
                <div>
                  <span className="font-medium text-slate-700">Recommendations:</span>
                  <p className="text-slate-900 mt-1">{report.recommendations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          {report.photos && report.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Service Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {report.photos.map((photo, index) => (
                    <div key={index} className="space-y-2">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || `Service photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      {photo.caption && (
                        <p className="text-sm text-slate-600">{photo.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleSendReport}
                disabled={emailLoading}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                {emailLoading ? 'Sending...' : 'Email Report'}
              </Button>
              
              {report.status === 'draft' && (
                <Button 
                  onClick={finalizeReport}
                  disabled={updating}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updating ? 'Finalizing...' : 'Finalize Report'}
                </Button>
              )}

              {report.next_service_date && report.customer.phone && (
                <Button 
                  onClick={handleSendSMSReminder}
                  disabled={smsLoading}
                  variant="outline"
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {smsLoading ? 'Sending...' : 'SMS Service Reminder'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">Created:</span>
                <p className="text-slate-900">{new Date(report.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">Status:</span>
                <p className="text-slate-900">{report.status}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ServiceReportDetail;

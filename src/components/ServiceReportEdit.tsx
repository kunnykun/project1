
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, ArrowLeft, Save } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface ServiceReportEditProps {
  reportId: string;
  onBack: () => void;
  onSave: () => void;
}

const FormSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer."),
  equipment_type: z.string().min(2, "Equipment type must be at least 2 characters."),
  equipment_model: z.string().optional(),
  equipment_serial: z.string().optional(),
  service_description: z.string().min(10, "Service description must be at least 10 characters."),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  technician_name: z.string().min(2, "Technician name must be at least 2 characters."),
  service_date: z.string().min(1, "Service date is required"),
  completion_date: z.string().optional(),
  next_service_date: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>

const ServiceReportEdit = ({ reportId, onBack, onSave }: ServiceReportEditProps) => {
  const [customers, setCustomers] = useState<{ id: string; name: string; }[]>([]);
  const [photos, setPhotos] = useState<Array<{ id: string; photo_url: string; order_index: number; caption?: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      customer_id: "",
      equipment_type: "",
      equipment_model: "",
      equipment_serial: "",
      service_description: "",
      findings: "",
      recommendations: "",
      technician_name: "",
      service_date: "",
      completion_date: "",
      next_service_date: "",
    },
  })

  useEffect(() => {
    fetchCustomers();
    fetchReportData();
  }, [reportId]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const fetchReportData = async () => {
    try {
      const { data: reportData, error: reportError } = await supabase
        .from('service_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      const { data: photosData, error: photosError } = await supabase
        .from('service_report_photos')
        .select('*')
        .eq('service_report_id', reportId)
        .order('order_index');

      if (photosError) throw photosError;

      // Populate form with existing data
      form.reset({
        customer_id: reportData.customer_id,
        equipment_type: reportData.equipment_type,
        equipment_model: reportData.equipment_model || "",
        equipment_serial: reportData.equipment_serial || "",
        service_description: reportData.service_description,
        findings: reportData.findings || "",
        recommendations: reportData.recommendations || "",
        technician_name: reportData.technician_name,
        service_date: reportData.service_date,
        completion_date: reportData.completion_date || "",
        next_service_date: reportData.next_service_date || "",
      });

      setPhotos(photosData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const uploadPhotos = async (files: File[]) => {
    setUploading(true);
    try {
      const newPhotos = await Promise.all(
        files.map(async (file, index) => {
          const { data, error } = await supabase.storage
            .from('service-photos')
            .upload(`${uuidv4()}-${file.name}`, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) {
            console.error('Error uploading photo:', error);
            toast({
              title: "Error",
              description: `Failed to upload ${file.name}`,
              variant: "destructive",
            });
            return null;
          }
          
          const publicURL = supabase.storage
            .from('service-photos')
            .getPublicUrl(data.path)
            .data.publicUrl;

          const orderIndex = photos.length + index;

          // Insert photo record into database
          const { data: photoRecord, error: insertError } = await supabase
            .from('service_report_photos')
            .insert({
              service_report_id: reportId,
              photo_url: publicURL,
              order_index: orderIndex,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting photo record:', insertError);
            return null;
          }

          return photoRecord;
        })
      );

      const uploadedPhotos = newPhotos.filter(photo => photo !== null);
      setPhotos(prevPhotos => [...prevPhotos, ...uploadedPhotos]);
      
      toast({
        title: "Success",
        description: "Photos uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Error",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadPhotos(files);
  };

  const removePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('service_report_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      setPhotos(photos.filter(photo => photo.id !== photoId));
      toast({
        title: "Success",
        description: "Photo removed successfully",
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "Failed to remove photo",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const updateData = {
        customer_id: values.customer_id,
        equipment_type: values.equipment_type,
        equipment_model: values.equipment_model || null,
        equipment_serial: values.equipment_serial || null,
        service_description: values.service_description,
        findings: values.findings || null,
        recommendations: values.recommendations || null,
        technician_name: values.technician_name,
        service_date: values.service_date,
        completion_date: values.completion_date || null,
        next_service_date: values.next_service_date || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('service_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service report updated successfully!",
      });
      
      onSave();
    } catch (error: any) {
      console.error('Error updating service report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update service report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading report data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold text-slate-800">Edit Service Report</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="customer_id">Customer</Label>
              <Controller
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.customer_id && (
                <p className="text-red-500 text-sm">{form.formState.errors.customer_id.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="service_date">Service Date</Label>
                <Input
                  type="date"
                  id="service_date"
                  {...form.register('service_date', { required: true })}
                />
                {form.formState.errors.service_date && <span className="text-red-500 text-sm">Service date is required</span>}
              </div>
              <div>
                <Label htmlFor="completion_date">Completion Date</Label>
                <Input
                  type="date"
                  id="completion_date"
                  {...form.register('completion_date')}
                />
              </div>
              <div>
                <Label htmlFor="next_service_date">Next Service Date</Label>
                <Input
                  type="date"
                  id="next_service_date"
                  {...form.register('next_service_date')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="equipment_type">Equipment Type</Label>
              <Input
                type="text"
                id="equipment_type"
                placeholder="e.g., Vacuum Cleaner"
                {...form.register('equipment_type', { required: true })}
              />
              {form.formState.errors.equipment_type && (
                <p className="text-red-500 text-sm">{form.formState.errors.equipment_type.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="equipment_model">Equipment Model</Label>
                <Input
                  type="text"
                  id="equipment_model"
                  placeholder="e.g., Model 123"
                  {...form.register('equipment_model')}
                />
              </div>
              <div>
                <Label htmlFor="equipment_serial">Equipment Serial</Label>
                <Input
                  type="text"
                  id="equipment_serial"
                  placeholder="e.g., Serial Number 456"
                  {...form.register('equipment_serial')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="service_description">Service Description</Label>
              <Textarea
                id="service_description"
                placeholder="Describe the service performed"
                {...form.register('service_description', { required: true })}
              />
              {form.formState.errors.service_description && (
                <p className="text-red-500 text-sm">{form.formState.errors.service_description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="findings">Findings</Label>
              <Textarea
                id="findings"
                placeholder="Enter any findings during the service"
                {...form.register('findings')}
              />
            </div>

            <div>
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                id="recommendations"
                placeholder="Enter any recommendations for the customer"
                {...form.register('recommendations')}
              />
            </div>

            <div>
              <Label htmlFor="technician_name">Technician Name</Label>
              <Input
                type="text"
                id="technician_name"
                placeholder="Enter technician name"
                {...form.register('technician_name', { required: true })}
              />
              {form.formState.errors.technician_name && (
                <p className="text-red-500 text-sm">{form.formState.errors.technician_name.message}</p>
              )}
            </div>

            <div>
              <Label>Photos</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <div className="flex items-center justify-between">
                <Button type="button" variant="secondary" asChild>
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Photos
                  </label>
                </Button>
                {uploading && <span className="text-slate-600">Uploading...</span>}
              </div>

              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || `Photo ${photo.order_index + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-white/50 hover:bg-white text-gray-800"
                      onClick={() => removePhoto(photo.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Update Service Report
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceReportEdit;

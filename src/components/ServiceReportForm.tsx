
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

interface ServiceReportFormProps {
  onBack: () => void;
  onSave: () => void;
}

const FormSchema = z.object({
  customer_id: z.string().min(1, {
    message: "Please select a customer.",
  }),
  equipment_type: z.string().min(2, {
    message: "Equipment type must be at least 2 characters.",
  }),
  equipment_model: z.string().optional(),
  equipment_serial: z.string().optional(),
  service_description: z.string().min(10, {
    message: "Service description must be at least 10 characters.",
  }),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  technician_name: z.string().min(2, {
    message: "Technician name must be at least 2 characters.",
  }),
  service_date: z.string().min(1, {
    message: "Service date is required",
  }),
  completion_date: z.string().optional(),
  next_service_date: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>

const ServiceReportForm = ({ onBack, onSave }: ServiceReportFormProps) => {
  const [customers, setCustomers] = useState<{ id: string; name: string; }[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

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
  }, []);

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

  const uploadPhotos = async (files: File[]) => {
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
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

          return publicURL;
        })
      );

      const uploadedUrls = urls.filter(url => url !== null) as string[];
      setPhotos(prevPhotos => [...prevPhotos, ...uploadedUrls]);
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

    const newPreviews = await Promise.all(
      files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });
      })
    );
    setPhotoPreviews(prevPreviews => [...prevPreviews, ...newPreviews]);

    await uploadPhotos(files);
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos(photos.filter((_, index) => index !== indexToRemove));
    setPhotoPreviews(photoPreviews.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const reportData = {
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
        status: 'draft'
      };

      const { data, error } = await supabase
        .from('service_reports')
        .insert([reportData])
        .select()
        .single();

      if (error) throw error;

      // Insert photos if any
      if (photos.length > 0) {
        const photoRecords = photos.map((photoUrl, index) => ({
          service_report_id: data.id,
          photo_url: photoUrl,
          order_index: index
        }));

        const { error: photoError } = await supabase
          .from('service_report_photos')
          .insert(photoRecords);

        if (photoError) {
          console.error('Error inserting photos:', photoError);
          // Don't fail the whole operation for photo errors
        }
      }

      toast({
        title: "Success",
        description: "Service report created successfully!",
      });
      
      navigate('/');
      onSave();
    } catch (error: any) {
      console.error('Error creating service report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create service report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-8">
      <Button variant="outline" onClick={onBack} className="mb-6">
        Go Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create New Service Report</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="customer_id">Customer</Label>
              <Controller
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Label htmlFor="completion_date">Target Completion Date</Label>
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
                <Label htmlFor="equipment_model">Equipment Model (Optional)</Label>
                <Input
                  type="text"
                  id="equipment_model"
                  placeholder="e.g., Model 123"
                  {...form.register('equipment_model')}
                />
              </div>
              <div>
                <Label htmlFor="equipment_serial">Equipment Serial (Optional)</Label>
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
              <Label htmlFor="findings">Findings (Optional)</Label>
              <Textarea
                id="findings"
                placeholder="Enter any findings during the service"
                {...form.register('findings')}
              />
            </div>

            <div>
              <Label htmlFor="recommendations">Recommendations (Optional)</Label>
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
                    Upload Photos
                  </label>
                </Button>
                {uploading && <span className="text-slate-600">Uploading...</span>}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Uploaded photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-white/50 hover:bg-white text-gray-800"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              Create Service Report
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceReportForm;

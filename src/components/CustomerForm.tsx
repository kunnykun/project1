
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Customer, CustomerFormData } from '@/types/customer';

interface CustomerFormProps {
  editingCustomer: Customer | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const CustomerForm = ({ editingCustomer, onCancel, onSuccess }: CustomerFormProps) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: editingCustomer?.name || '',
    business_name: editingCustomer?.business_name || '',
    email: editingCustomer?.email || '',
    phone: editingCustomer?.phone || '',
    office_phone: editingCustomer?.office_phone || '',
    mobile_phone: editingCustomer?.mobile_phone || '',
    address: editingCustomer?.address || ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customer updated successfully",
        });
      } else {
        // Create new customer
        const { error } = await supabase
          .from('customers')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customer added successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: editingCustomer ? "Failed to update customer" : "Failed to add customer",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contact Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (General)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office_phone">Office Phone</Label>
              <Input
                id="office_phone"
                value={formData.office_phone}
                onChange={(e) => setFormData({ ...formData, office_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile_phone">Mobile Phone</Label>
              <Input
                id="mobile_phone"
                value={formData.mobile_phone}
                onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button type="submit">
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerForm;


import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/customer';
import CustomerForm from './CustomerForm';
import CustomerCard from './CustomerCard';
import DeleteCustomerDialog from './DeleteCustomerDialog';
import EmptyCustomersState from './EmptyCustomersState';

interface CustomerListProps {
  onBack: () => void;
}

const CustomerList = ({ onBack }: CustomerListProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCustomer(null);
    fetchCustomers();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
  };

  const handleDeleteDialogClose = () => {
    setDeletingCustomer(null);
  };

  const handleDeleteSuccess = () => {
    setDeletingCustomer(null);
    fetchCustomers();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {showForm && (
        <CustomerForm
          editingCustomer={editingCustomer}
          onCancel={handleFormCancel}
          onSuccess={handleFormSuccess}
        />
      )}

      {customers.length === 0 ? (
        <EmptyCustomersState onAddCustomer={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deletingCustomer?.id === customer.id}
            />
          ))}
        </div>
      )}

      <DeleteCustomerDialog
        customer={deletingCustomer}
        isOpen={!!deletingCustomer}
        onClose={handleDeleteDialogClose}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default CustomerList;

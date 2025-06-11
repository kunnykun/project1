
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/customer';

interface DeleteCustomerDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteCustomerDialog = ({ customer, isOpen, onClose, onSuccess }: DeleteCustomerDialogProps) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!customer) return;

    try {
      // Check if customer has any service reports
      const { data: reports, error: reportsError } = await supabase
        .from('service_reports')
        .select('id')
        .eq('customer_id', customer.id);

      if (reportsError) throw reportsError;

      if (reports && reports.length > 0) {
        toast({
          title: "Cannot Delete Customer",
          description: "This customer has associated service reports. Please delete or reassign the reports first.",
          variant: "destructive",
        });
        onClose();
        return;
      }

      // Delete the customer
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer has been deleted",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    } finally {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the customer
            "{customer?.name}" and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Customer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCustomerDialog;


import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Plus } from 'lucide-react';

interface EmptyCustomersStateProps {
  onAddCustomer: () => void;
}

const EmptyCustomersState = ({ onAddCustomer }: EmptyCustomersStateProps) => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">No customers yet</h3>
        <p className="text-slate-600 mb-4">Add your first customer to get started with service reports.</p>
        <Button onClick={onAddCustomer}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Customer
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmptyCustomersState;

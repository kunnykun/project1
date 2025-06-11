
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Mail, Phone, MapPin, Edit, Trash2, Building, Smartphone } from 'lucide-react';
import { Customer } from '@/types/customer';

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  isDeleting: boolean;
}

const CustomerCard = ({ customer, onEdit, onDelete, isDeleting }: CustomerCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-slate-800">{customer.name}</span>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(customer)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(customer)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {customer.business_name && (
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Building className="h-4 w-4" />
              <span>{customer.business_name}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Mail className="h-4 w-4" />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Phone className="h-4 w-4" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.office_phone && (
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Phone className="h-4 w-4" />
              <span>Office: {customer.office_phone}</span>
            </div>
          )}
          {customer.mobile_phone && (
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Smartphone className="h-4 w-4" />
              <span>Mobile: {customer.mobile_phone}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <MapPin className="h-4 w-4" />
              <span>{customer.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;

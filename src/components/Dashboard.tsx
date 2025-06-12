import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, FileText, Settings, LogOut, Calendar } from 'lucide-react';
import { useState } from 'react';
import CustomerList from './CustomerList';
import ServiceReportForm from './ServiceReportForm';
import ServiceReportList from './ServiceReportList';
import DraftReportsSummary from './DraftReportsSummary';
import RecentActivity from './RecentActivity';
import ServiceCalendar from './ServiceCalendar';
import CurrentDateTime from './CurrentDateTime';
import DatabaseStats from './DatabaseStats';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'customers' | 'reports' | 'new-report' | 'calendar'>('dashboard');

  const handleSignOut = async () => {
    await signOut();
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'customers':
        return <CustomerList onBack={() => setActiveView('dashboard')} />;
      case 'reports':
        return <ServiceReportList onBack={() => setActiveView('dashboard')} onNewReport={() => setActiveView('new-report')} />;
      case 'new-report':
        return <ServiceReportForm onBack={() => setActiveView('dashboard')} onSave={() => setActiveView('reports')} />;
      case 'calendar':
        return (
          <div>
            <Button 
              variant="outline" 
              onClick={() => setActiveView('dashboard')}
              className="mb-6"
            >
              ← Back to Dashboard
            </Button>
            <ServiceCalendar />
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <DatabaseStats />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveView('new-report')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">New Service Report</CardTitle>
                  <Plus className="h-6 w-6 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Create a new service report with photos and documentation</CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveView('customers')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">Customers</CardTitle>
                  <Users className="h-6 w-6 text-green-600" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Manage your customer database and contact information</CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveView('reports')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">Service Reports</CardTitle>
                  <FileText className="h-6 w-6 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <CardDescription>View and manage all service reports and documentation</CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveView('calendar')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">Service Calendar</CardTitle>
                  <Calendar className="h-6 w-6 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <CardDescription>Plan and schedule service work for the week ahead</CardDescription>
                </CardContent>
              </Card>
            </div>

            <DraftReportsSummary />

            <RecentActivity />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <img 
                src="/images/logo.png" 
                alt="Australian Vacuum Services" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Australian Vacuum Services</h1>
                <p className="text-sm text-slate-600">Service Report Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <CurrentDateTime />
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-600">Welcome, {user?.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default Dashboard;

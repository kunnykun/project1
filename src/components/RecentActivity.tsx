
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Clock, CheckCircle } from 'lucide-react';
import { useRecentActivity } from '@/hooks/useRecentActivity';

const RecentActivity = () => {
  const { activities, loading } = useRecentActivity();

  const getIcon = (type: string, action: string) => {
    if (type === 'service_report') {
      return <FileText className="h-4 w-4 text-purple-600" />;
    }
    return <Users className="h-4 w-4 text-green-600" />;
  };

  const getStatusBadge = (action: string, status?: string) => {
    if (action === 'drafted') {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Draft</Badge>;
    }
    if (action === 'created' && status === 'completed') {
      return <Badge variant="default" className="bg-green-600">Completed</Badge>;
    }
    if (action === 'created') {
      return <Badge variant="secondary">New</Badge>;
    }
    if (action === 'updated') {
      return <Badge variant="outline">Updated</Badge>;
    }
    return null;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">Loading recent activity...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-slate-600">No recent activity. Create your first service report or add a customer to get started!</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={`${activity.type}-${activity.id}-${activity.timestamp}`}
                className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
              >
                <div className="flex items-center space-x-3">
                  {getIcon(activity.type, activity.action)}
                  <div>
                    <div className="font-medium text-slate-900">{activity.title}</div>
                    <div className="text-sm text-slate-600">{activity.description}</div>
                    <div className="text-xs text-slate-500 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(activity.action, activity.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;

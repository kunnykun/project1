
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface ServiceReport {
  id: string;
  service_date: string;
  completion_date: string | null;
  next_service_date: string | null;
  equipment_type: string;
  equipment_model: string | null;
  status: string;
  customer: {
    name: string;
  } | null;
}

interface CalendarEvent {
  id: string;
  date: string;
  type: 'service' | 'completion' | 'next_service';
  title: string;
  customerName: string;
  equipmentType: string;
  status?: string;
}

const ServiceCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [serviceReports, setServiceReports] = useState<ServiceReport[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServiceReports();
  }, []);

  const fetchServiceReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_reports')
        .select(`
          id,
          service_date,
          completion_date,
          next_service_date,
          equipment_type,
          equipment_model,
          status,
          customer:customers(name)
        `)
        .order('service_date', { ascending: true });

      if (error) throw error;
      
      setServiceReports(data || []);
      processCalendarEvents(data || []);
    } catch (error) {
      console.error('Error fetching service reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCalendarEvents = (reports: ServiceReport[]) => {
    const events: CalendarEvent[] = [];

    reports.forEach(report => {
      const customerName = report.customer?.name || 'Unknown Customer';
      const equipmentInfo = `${report.equipment_type}${report.equipment_model ? ` (${report.equipment_model})` : ''}`;

      // Add service date event
      events.push({
        id: `${report.id}-service`,
        date: report.service_date,
        type: 'service',
        title: 'Service Scheduled',
        customerName,
        equipmentType: equipmentInfo,
        status: report.status
      });

      // Add completion date event if exists
      if (report.completion_date) {
        events.push({
          id: `${report.id}-completion`,
          date: report.completion_date,
          type: 'completion',
          title: 'Service Completed',
          customerName,
          equipmentType: equipmentInfo,
          status: report.status
        });
      }

      // Add next service date event if exists
      if (report.next_service_date) {
        events.push({
          id: `${report.id}-next`,
          date: report.next_service_date,
          type: 'next_service',
          title: 'Next Service Due',
          customerName,
          equipmentType: equipmentInfo
        });
      }
    });

    setCalendarEvents(events);
  };

  const getWeekDays = () => {
    if (!selectedDate) return [];
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => 
      isSameDay(new Date(event.date), date)
    );
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'completion':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'next_service':
        return <AlertCircle className="h-3 w-3 text-orange-600" />;
      default:
        return <Clock className="h-3 w-3 text-blue-600" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'completion':
        return 'bg-green-500';
      case 'next_service':
        return 'bg-orange-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getEventBadgeVariant = (type: string) => {
    switch (type) {
      case 'completion':
        return 'default' as const;
      case 'next_service':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Service Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              
              {/* Legend */}
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm">Legend:</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Service Scheduled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Service Completed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>Next Service Due</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Week Overview</h3>
              <div className="space-y-2">
                {getWeekDays().map(day => {
                  const eventsForDay = getEventsForDate(day);
                  return (
                    <div key={day.toISOString()} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{format(day, 'EEEE, MMM d')}</span>
                        <Badge variant="outline">{eventsForDay.length} events</Badge>
                      </div>
                      {eventsForDay.length > 0 ? (
                        <div className="space-y-2">
                          {eventsForDay.map(event => (
                            <div key={event.id} className="flex items-start gap-2 text-sm p-2 rounded border-l-2" 
                                 style={{ borderLeftColor: event.type === 'completion' ? '#22c55e' : 
                                                         event.type === 'next_service' ? '#f97316' : '#3b82f6' }}>
                              <div className="flex items-center gap-1 mt-0.5">
                                {getEventIcon(event.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{event.title}</span>
                                  <Badge variant={getEventBadgeVariant(event.type)} className="text-xs">
                                    {event.type === 'next_service' ? 'DUE' : 
                                     event.type === 'completion' ? 'DONE' : 'SCHEDULED'}
                                  </Badge>
                                </div>
                                <div className="text-gray-600">{event.customerName}</div>
                                <div className="text-gray-500 text-xs">{event.equipmentType}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No events scheduled</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceCalendar;

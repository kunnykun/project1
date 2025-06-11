
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

const CurrentDateTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Clock className="h-4 w-4" />
      <span>{format(currentTime, 'EEEE, MMMM d, yyyy')}</span>
      <span className="font-mono">{format(currentTime, 'HH:mm:ss')}</span>
    </div>
  );
};

export default CurrentDateTime;

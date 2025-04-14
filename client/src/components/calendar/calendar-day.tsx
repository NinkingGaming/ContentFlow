import { useDrop } from 'react-dnd';
import { EventItem } from './event-item';
import { ScheduleEvent } from '@shared/schema';
import { cn } from '@/lib/utils';

interface CalendarDayProps {
  date: Date;
  events: ScheduleEvent[];
  isCurrentMonth: boolean;
  onDropEvent: (date: Date, eventData: any) => void;
  onRemoveEvent: (eventId: number) => void;
}

export function CalendarDay({ date, events, isCurrentMonth, onDropEvent, onRemoveEvent }: CalendarDayProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'SCHEDULE_EVENT',
    drop: (item: any) => {
      onDropEvent(date, item);
      return { moved: true };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });
  
  const isToday = new Date().toDateString() === date.toDateString();
  
  // Determine if the day has events
  const hasEvents = events.length > 0;
  
  // Map to count event types
  const eventTypes = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Create a summary of events
  const eventSummary = Object.entries(eventTypes).map(([type, count]) => {
    const typeLabels: Record<string, string> = {
      filming_day: "Filming",
      secondary_filming_day: "Secondary Filming",
      upload_day: "Upload"
    };
    
    return `${count} ${typeLabels[type] || type}`;
  }).join(', ');
  
  return (
    <div
      ref={drop}
      className={cn(
        'h-32 border p-1 overflow-y-auto transition-all duration-200',
        isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-900',
        isToday && 'ring-2 ring-blue-500',
        isOver && 'bg-blue-50 dark:bg-blue-900/20',
        hasEvents && 'shadow-md hover:shadow-lg'
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <span 
          className={cn(
            'text-sm font-medium',
            !isCurrentMonth && 'text-gray-400 dark:text-gray-500',
            isToday && 'text-blue-600 dark:text-blue-400 font-bold',
            hasEvents && 'font-bold'
          )}
        >
          {date.getDate()}
          {hasEvents && (
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              ({events.length})
            </span>
          )}
        </span>
      </div>
      
      <div className="space-y-1">
        {events.map(event => (
          <EventItem 
            key={event.id} 
            event={event} 
            isPlaced={true} 
            onRemove={onRemoveEvent} 
          />
        ))}
      </div>
    </div>
  );
}
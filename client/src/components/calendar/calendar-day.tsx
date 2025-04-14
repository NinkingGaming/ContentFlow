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
  
  return (
    <div
      ref={drop}
      className={cn(
        'h-32 border p-1 overflow-y-auto',
        isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-900',
        isToday && 'ring-2 ring-blue-500',
        isOver && 'bg-blue-50 dark:bg-blue-900/20'
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <span 
          className={cn(
            'text-sm font-medium',
            !isCurrentMonth && 'text-gray-400 dark:text-gray-500',
            isToday && 'text-blue-600 dark:text-blue-400 font-bold'
          )}
        >
          {date.getDate()}
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
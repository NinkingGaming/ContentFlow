import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarDay } from './calendar-day';
import { EventSource } from './event-source';
import { useSchedule, ScheduleEventInput } from '@/hooks/use-schedule';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScheduleEvent } from '@shared/schema';
import { format } from 'date-fns';

interface CalendarViewProps {
  projectId: number;
}

export function CalendarView({ projectId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEventType, setNewEventType] = useState<string | null>(null);
  const [eventNotes, setEventNotes] = useState('');
  
  const {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useSchedule(projectId);

  // Handle month navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Generate calendar days including padding for previous/next months
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
    const calendarDays: Date[] = [];
    
    // Add days from previous month for padding
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);
    
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      calendarDays.push(new Date(prevMonthYear, prevMonth, daysInPrevMonth - i));
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(currentYear, currentMonth, i));
    }
    
    // Add days from next month for padding to complete 6 rows
    const totalDaysNeeded = 42; // 6 rows of 7 days
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    let nextMonthDay = 1;
    while (calendarDays.length < totalDaysNeeded) {
      calendarDays.push(new Date(nextMonthYear, nextMonth, nextMonthDay++));
    }
    
    return calendarDays;
  };

  // Filter events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };
  
  // Handle dropping an event on a calendar day
  const handleDropEvent = (date: Date, eventData: any) => {
    if (eventData.id < 0) {
      // This is a template event, create a new one
      const eventInput: ScheduleEventInput = {
        title: eventData.title,
        type: eventData.type,
        date: date.toISOString(),
        color: eventData.color,
      };
      
      // Show dialog for optional notes
      setSelectedDate(date);
      setNewEventType(eventData.type);
      setEventNotes('');
    } else {
      // This is an existing event, update its date
      updateEvent({
        eventId: eventData.id,
        data: { date: date.toISOString() }
      });
    }
  };
  
  // Handle creating a new event
  const handleCreateEvent = (type: string) => {
    // Show dialog to select date and enter notes
    setNewEventType(type);
    setSelectedDate(new Date(currentYear, currentMonth, 15)); // Default to middle of month
    setEventNotes('');
  };
  
  // Handle saving a new event from dialog
  const handleSaveEvent = () => {
    if (!selectedDate || !newEventType) return;
    
    // Determine title and color based on type
    let title = "Event";
    let color = "#6B7280"; // gray
    
    if (newEventType === 'filming_day') {
      title = "Filming Day";
      color = "#EF4444"; // red
    } else if (newEventType === 'secondary_filming_day') {
      title = "Secondary Filming Day";
      color = "#3B82F6"; // blue
    } else if (newEventType === 'upload_day') {
      title = "Upload Day";
      color = "#10B981"; // green
    }
    
    // Create the event
    const eventInput: ScheduleEventInput = {
      title,
      type: newEventType,
      date: selectedDate.toISOString(),
      notes: eventNotes || undefined,
      color,
    };
    
    createEvent(eventInput);
    
    // Reset dialog state
    setSelectedDate(null);
    setNewEventType(null);
    setEventNotes('');
  };
  
  // Get the calendar days
  const calendarDays = getCalendarDays();
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Schedule</h2>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="text-lg font-medium min-w-[200px] text-center">
              {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now.getMonth());
                setCurrentYear(now.getFullYear());
              }}
            >
              Today
            </Button>
          </div>
        </div>
        
        <EventSource 
          events={events} 
          onCreateEvent={handleCreateEvent} 
        />
        
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          {/* Calendar header */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-gray-100 dark:bg-gray-800 p-2 text-center font-medium">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((date, index) => (
            <CalendarDay
              key={index}
              date={date}
              events={getEventsForDate(date)}
              isCurrentMonth={date.getMonth() === currentMonth}
              onDropEvent={handleDropEvent}
              onRemoveEvent={deleteEvent}
            />
          ))}
        </div>
        
        {/* New Event Dialog */}
        <Dialog 
          open={!!selectedDate && !!newEventType} 
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDate(null);
              setNewEventType(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newEventType === 'filming_day' && 'Add Filming Day'}
                {newEventType === 'secondary_filming_day' && 'Add Secondary Filming Day'}
                {newEventType === 'upload_day' && 'Add Upload Day'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this event..."
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedDate(null);
                  setNewEventType(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>Save Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}
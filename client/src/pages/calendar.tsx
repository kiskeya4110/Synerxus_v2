import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

// Form schema for adding events
const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectId: z.string().optional(),
  eventType: z.string().min(1, "Event type is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  attendees: z.string().optional(), // Comma-separated user IDs
});

type EventFormData = z.infer<typeof eventFormSchema>;

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { toast } = useToast();

  // Get current user ID for scoping
  const userId = localStorage.getItem('currentUserId');

  // Fetch events from API - scoped to user
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar-events", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/calendar-events?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch projects for dropdown - scoped to user
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/projects?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch users/volunteers for attendee selection
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Form for adding events
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: "",
      eventType: "volunteer_shift",
      startTime: "",
      endTime: "",
      location: "",
      attendees: "",
    },
  });

  // Add event mutation
  const addEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const attendeesArray = data.attendees
        ? data.attendees.split(",").map(id => parseInt(id.trim())).filter(n => !isNaN(n))
        : [];
        
      const payload = {
        ...data,
        projectId: data.projectId ? parseInt(data.projectId) : null,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        attendees: attendeesArray,
      };
      return apiRequest("POST", "/api/calendar-events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events", userId] });
      setIsAddEventOpen(false);
      form.reset();
      toast({
        title: "Event created!",
        description: "The event has been added to your calendar.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    addEventMutation.mutate(data);
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    return events.filter((event: any) => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      volunteer_shift: "bg-blue-500",
      meeting: "bg-purple-500",
      deadline: "bg-red-500",
      training: "bg-green-500",
    };
    return colors[eventType] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage volunteer shifts, meetings, and deadlines
          </p>
        </div>
        <Button onClick={() => setIsAddEventOpen(true)} data-testid="button-add-event">
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="bg-gray-100 dark:bg-gray-800 p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="bg-white dark:bg-gray-900 p-2 min-h-[100px]" />
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              
              return (
                <div
                  key={day}
                  className={`bg-white dark:bg-gray-900 p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                  onClick={() => {
                    setSelectedDate(dayDate);
                    const defaultStart = new Date(dayDate);
                    defaultStart.setHours(9, 0, 0, 0);
                    const defaultEnd = new Date(dayDate);
                    defaultEnd.setHours(17, 0, 0, 0);
                    form.reset({
                      title: "",
                      description: "",
                      projectId: "",
                      eventType: "volunteer_shift",
                      startTime: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
                      endTime: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
                      location: "",
                      attendees: "",
                    });
                    setIsAddEventOpen(true);
                  }}
                  data-testid={`day-${day}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day}
                  </div>
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    {dayEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className={`text-xs px-2 py-1 rounded ${getEventColor(event.eventType)} text-white cursor-pointer hover:opacity-80`}
                        onClick={() => setSelectedEvent(event)}
                        data-testid={`event-${event.id}`}
                      >
                        {new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {event.title}
                      </div>
                    ))}
                    {dayEvents.length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
                        Click to add event
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Event Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Event{selectedDate && ` - ${format(selectedDate, 'MMMM d, yyyy')}`}</DialogTitle>
            <DialogDescription>
              Create a new calendar event for volunteers, meetings, or deadlines.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Event title" data-testid="input-event-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Event description" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="volunteer_shift">Volunteer Shift</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" data-testid="input-start-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" data-testid="input-end-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Event location or Virtual" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Users/Volunteers (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="User IDs comma-separated (e.g., 1, 2, 3)" data-testid="input-attendees" />
                    </FormControl>
                    <p className="text-sm text-gray-500">
                      {users.length > 0 ? `Available users: ${users.map((u: any) => `${u.id} (${u.displayName || u.email})`).slice(0, 5).join(", ")}${users.length > 5 ? "..." : ""}` : "Loading users..."}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddEventOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addEventMutation.isPending} data-testid="button-submit-event">
                  {addEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent && new Date(selectedEvent.startTime).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEvent?.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
              </div>
            )}
            {selectedEvent?.projectId && (
              <div>
                <h4 className="font-semibold mb-2">Project</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {projects.find((p: any) => p.id === selectedEvent.projectId)?.name || `Project #${selectedEvent.projectId}`}
                </p>
              </div>
            )}
            {selectedEvent?.location && (
              <div>
                <h4 className="font-semibold mb-2">Location</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.location}</p>
              </div>
            )}
            <div>
              <h4 className="font-semibold mb-2">Type</h4>
              <Badge>{selectedEvent?.eventType?.replace('_', ' ')}</Badge>
            </div>
            {selectedEvent?.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Assigned Users</h4>
                <div className="space-y-1">
                  {selectedEvent.attendees.map((userId: number) => {
                    const user = users.find((u: any) => u.id === userId);
                    return (
                      <p key={userId} className="text-sm text-gray-600 dark:text-gray-400">
                        {user ? `${user.displayName || user.email} (ID: ${userId})` : `User #${userId}`}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

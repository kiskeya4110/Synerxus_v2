import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, User } from "@shared/schema";

const taskFormSchema = z.object({
  title: z.string().min(3, "Task title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["todo", "pending", "in progress", "completed"]).default("todo"),
  dueDate: z.string().optional(),
  assigneeId: z.number().optional()
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface CreateTaskDialogProps {
  projectId: number;
}

interface VolunteerWithScore extends User {
  matchScore?: number;
  matchReasons?: string[];
}

export function CreateTaskDialog({ projectId }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Fetch AI-recommended volunteers for this project
  const { data: volunteers = [], isLoading: loadingRecommendations } = useQuery<VolunteerWithScore[]>({
    queryKey: ["/api/projects", projectId, "recommended-volunteers"],
    enabled: open
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      dueDate: "",
      assigneeId: undefined
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      return apiRequest("POST", "/api/tasks", {
        ...data,
        projectId,
        assigneeId: data.assigneeId || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task created successfully"
      });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: TaskFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-create-task-${projectId}`}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to this project
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Survey water sources" {...field} data-testid="input-task-title" />
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
                    <Textarea
                      placeholder="Describe what needs to be done..."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="input-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-task-due-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to Volunteer (AI-Recommended)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : parseInt(value))}
                    value={field.value?.toString() || "unassigned"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-task-assignee">
                        <SelectValue placeholder="Select volunteer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {loadingRecommendations ? (
                        <div className="px-2 py-1 text-sm text-muted-foreground">Loading recommendations...</div>
                      ) : (
                        volunteers.filter(v => v.userType === 'volunteer').map((volunteer) => (
                          <SelectItem 
                            key={volunteer.id} 
                            value={volunteer.id!.toString()}
                            data-testid={`select-volunteer-${volunteer.id}`}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{volunteer.username}</span>
                              {volunteer.matchScore !== undefined && (
                                <span className="text-xs text-muted-foreground font-semibold">
                                  {volunteer.matchScore}% match
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {volunteers.length > 0 && volunteers[0]?.matchReasons && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Top match: {volunteers[0].matchReasons[0]}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-task">
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface EditTaskDialogProps {
  task: Task;
}

interface VolunteerWithScore extends User {
  matchScore?: number;
  matchReasons?: string[];
}

export function EditTaskDialog({ task }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Fetch AI-recommended volunteers sorted by match score from project
  const { data: recommendedVolunteers = [], isLoading: loadingRecommendations } = useQuery<VolunteerWithScore[]>({
    queryKey: ["/api/projects", task.projectId, "recommended-volunteers"],
    enabled: open && !!task.projectId,
  });

  // Fallback to all volunteers if task has no project (shouldn't happen but for safety)
  const { data: allVolunteers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: open && !task.projectId
  });

  // Use recommended volunteers if available, otherwise fall back to all volunteers
  const volunteers: VolunteerWithScore[] = task.projectId ? recommendedVolunteers : allVolunteers;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      status: (task.status as any) || "todo",
      dueDate: task.dueDate ? (typeof task.dueDate === 'string' ? task.dueDate : new Date(task.dueDate).toISOString().split('T')[0]) : "",
      assigneeId: task.assigneeId || undefined
    }
  });

  const editMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      return apiRequest("PATCH", `/api/tasks/${task.id}`, {
        ...data,
        assigneeId: data.assigneeId || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: TaskFormValues) => {
    editMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-edit-task-${task.id}`}>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update task details and assignment</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-task-title" />
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
                    <Textarea className="min-h-[80px]" {...field} data-testid="input-edit-task-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-task-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-edit-task-due-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to Volunteer (AI-Recommended)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : parseInt(value))}
                    value={field.value?.toString() || "unassigned"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-task-assignee">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {loadingRecommendations ? (
                        <div className="px-2 py-1 text-sm text-muted-foreground">Loading recommendations...</div>
                      ) : (
                        volunteers.filter(v => v.userType === 'volunteer').map((volunteer) => (
                          <SelectItem 
                            key={volunteer.id} 
                            value={volunteer.id!.toString()}
                            data-testid={`select-volunteer-${volunteer.id}`}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{volunteer.username}</span>
                              {volunteer.matchScore !== undefined && (
                                <span className="text-xs text-muted-foreground font-semibold">
                                  {volunteer.matchScore}% match
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {volunteers.length > 0 && volunteers[0]?.matchReasons && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Top match: {volunteers[0].matchReasons[0]}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending} data-testid="button-update-task">
                {editMutation.isPending ? "Updating..." : "Update Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteTaskDialogProps {
  task: Task;
}

export function DeleteTaskDialog({ task }: DeleteTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tasks/${task.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully"
      });
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-delete-task-${task.id}`}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{task.title}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid="button-confirm-delete-task"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

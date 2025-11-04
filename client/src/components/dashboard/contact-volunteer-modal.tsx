import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import UserAvatar from "@/components/ui/user-avatar";
import { Send, UserPlus } from "lucide-react";
import { insertMessageSchema } from "@shared/schema";

interface ContactVolunteerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationUserId: number;
  organizationId?: number;
}

// Client-side form validation schema extending insertMessageSchema
const formSchema = insertMessageSchema.extend({
  receiverId: z.number({ required_error: "Please select a volunteer" }),
  content: z.string().min(1, "Message is required"),
}).refine((data) => data.receiverId !== data.senderId, {
  message: "Cannot send message to yourself",
  path: ["receiverId"],
});

type FormData = z.infer<typeof formSchema>;

export default function ContactVolunteerModal({
  open,
  onOpenChange,
  organizationUserId,
  organizationId,
}: ContactVolunteerModalProps) {
  const { toast } = useToast();

  // Form with zod validation
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      senderId: organizationUserId,
      receiverId: 0,
      content: "",
      subject: "",
      messageType: "general",
      projectId: undefined,
      read: false,
    },
  });

  // Fetch current user to get organizationId if not provided
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/me", organizationUserId],
    queryFn: async () => {
      const response = await fetch(`/api/users/me?userId=${organizationUserId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !organizationId && !!organizationUserId,
  });

  const orgId = organizationId || currentUser?.organizationId;

  // Fetch only volunteers assigned to this organization's projects
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments"],
    enabled: open && !!orgId,
  });

  // Fetch all users and projects
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const { data: allProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: open,
  });

  // Filter to only volunteers assigned to organization's projects
  const organizationProjects = allProjects.filter((p: any) => p.organizationId === orgId);
  const assignedVolunteerIds = new Set(projectAssignments.filter((pa: any) => 
    organizationProjects.some((p: any) => p.id === pa.projectId)
  ).map((pa: any) => pa.volunteerId));

  const volunteers = allUsers.filter((u: any) => 
    u.userType === "volunteer" && assignedVolunteerIds.has(u.id)
  );

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Add to project mutation
  const addToProjectMutation = useMutation({
    mutationFn: async (data: { projectId: number; volunteerId: number }) => {
      // Validate that the project belongs to this organization
      const project = organizationProjects.find((p: any) => p.id === data.projectId);
      if (!project) {
        throw new Error("Invalid project selection");
      }
      
      const response = await fetch("/api/project-assignments", {
        method: "POST",
        body: JSON.stringify({
          projectId: data.projectId,
          volunteerId: data.volunteerId,
          status: "active",
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to add volunteer to project");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Volunteer added",
        description: "Volunteer has been added to the project",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add volunteer",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    sendMessageMutation.mutate(data);
  };

  const handleAddToProject = () => {
    const receiverId = form.getValues("receiverId");
    const projectId = form.getValues("projectId");
    
    if (!receiverId || !projectId) {
      toast({
        title: "Missing information",
        description: "Please select both a volunteer and a project",
        variant: "destructive",
      });
      return;
    }

    addToProjectMutation.mutate({
      projectId,
      volunteerId: receiverId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact Volunteer</DialogTitle>
          <DialogDescription>
            Send a message to volunteers working on your projects
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {/* Select Volunteer */}
            <FormField
              control={form.control}
              name="receiverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Volunteer</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-volunteer">
                        <SelectValue placeholder="Choose a volunteer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {volunteers.map((volunteer) => (
                        <SelectItem key={volunteer.id} value={volunteer.id.toString()}>
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              src={volunteer.avatar}
                              name={volunteer.displayName}
                              email={volunteer.email}
                              className="h-6 w-6"
                            />
                            <span>{volunteer.displayName || volunteer.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {volunteers.length === 0 && (
                        <SelectItem value="none" disabled>
                          No volunteers assigned to your projects
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message Type */}
            <FormField
              control={form.control}
              name="messageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-message-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General Message</SelectItem>
                      <SelectItem value="project_invite">Project Invitation</SelectItem>
                      <SelectItem value="project_removal">Project Removal Notice</SelectItem>
                      <SelectItem value="volunteer_request">Volunteer Request</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Select Project (Optional) */}
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-project">
                        <SelectValue placeholder="Choose a project (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {organizationProjects.map((project) => (
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

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Message subject"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-subject"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your message here..."
                      rows={6}
                      {...field}
                      data-testid="textarea-message"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={sendMessageMutation.isPending}
                className="flex-1"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
              
              {form.watch("projectId") && (
                <Button
                  type="button"
                  onClick={handleAddToProject}
                  disabled={addToProjectMutation.isPending || !form.watch("receiverId")}
                  variant="outline"
                  data-testid="button-add-to-project"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add to Project
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

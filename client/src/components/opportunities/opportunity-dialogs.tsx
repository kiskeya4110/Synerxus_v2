import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Opportunity, User } from "@shared/schema";

const opportunityFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  requiredSkills: z.string(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  timeCommitment: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  volunteersNeeded: z.number().min(1).default(1),
  category: z.string().optional(),
  benefits: z.string().optional(),
  requirements: z.string().optional(),
  status: z.enum(["open", "closed", "filled"]).default("open"),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface CreateOpportunityDialogProps {
  organizationId: number;
}

export function CreateOpportunityDialog({ organizationId }: CreateOpportunityDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      title: "",
      description: "",
      requiredSkills: "",
      location: "",
      isRemote: false,
      timeCommitment: "",
      startDate: "",
      endDate: "",
      volunteersNeeded: 1,
      category: "",
      benefits: "",
      requirements: "",
      status: "open",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: OpportunityFormValues) => {
      return apiRequest("POST", "/api/opportunities", {
        ...data,
        organizationId,
        requiredSkills: data.requiredSkills
          ? data.requiredSkills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Success",
        description: "Opportunity posted successfully",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post opportunity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OpportunityFormValues) => {
    createMutation.mutate(data);
  };

  const isRemote = form.watch("isRemote");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-opportunity" className="min-h-[44px]">
          <Plus className="w-4 h-4 mr-2" />
          Post Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Post Volunteer Opportunity</DialogTitle>
          <DialogDescription>
            Create a new volunteer opportunity to connect with passionate volunteers worldwide
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Opportunity Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="e.g., Community Health Volunteer"
                data-testid="input-opportunity-title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                {...form.register("description")}
                rows={4}
                placeholder="Describe the volunteer role, responsibilities, and impact..."
                data-testid="textarea-opportunity-description"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => form.setValue("category", value)}>
                <SelectTrigger data-testid="select-opportunity-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="community">Community Development</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="requiredSkills">Required Skills</Label>
              <Input
                id="requiredSkills"
                {...form.register("requiredSkills")}
                placeholder="e.g., First Aid, Teaching, Communication (comma-separated)"
                data-testid="input-required-skills"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isRemote"
                checked={isRemote}
                onCheckedChange={(checked) => form.setValue("isRemote", checked)}
                data-testid="switch-is-remote"
              />
              <Label htmlFor="isRemote">This is a remote opportunity</Label>
            </div>

            {!isRemote && (
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...form.register("location")}
                  placeholder="e.g., Nairobi, Kenya"
                  data-testid="input-location"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeCommitment">Time Commitment</Label>
              <Input
                id="timeCommitment"
                {...form.register("timeCommitment")}
                placeholder="e.g., 10 hours/week"
                data-testid="input-time-commitment"
              />
            </div>

            <div>
              <Label htmlFor="volunteersNeeded">Volunteers Needed</Label>
              <Input
                id="volunteersNeeded"
                type="number"
                {...form.register("volunteersNeeded", { valueAsNumber: true })}
                min={1}
                data-testid="input-volunteers-needed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                data-testid="input-start-date"
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="benefits">Benefits for Volunteers</Label>
              <Textarea
                id="benefits"
                {...form.register("benefits")}
                rows={3}
                placeholder="What will volunteers gain from this experience?"
                data-testid="textarea-benefits"
              />
            </div>

            <div>
              <Label htmlFor="requirements">Additional Requirements</Label>
              <Textarea
                id="requirements"
                {...form.register("requirements")}
                rows={3}
                placeholder="Any specific requirements, certifications, or qualifications needed?"
                data-testid="textarea-requirements"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value) => form.setValue("status", value as "open" | "closed" | "filled")}>
              <SelectTrigger data-testid="select-opportunity-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setOpen(false);
              }}
              disabled={createMutation.isPending}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? "Posting..." : "Post Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditOpportunityDialogProps {
  opportunity: Opportunity;
}

export function EditOpportunityDialog({ opportunity }: EditOpportunityDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      title: opportunity.title,
      description: opportunity.description,
      requiredSkills: opportunity.requiredSkills?.join(", ") || "",
      location: opportunity.location || "",
      isRemote: opportunity.isRemote || false,
      timeCommitment: opportunity.timeCommitment || "",
      startDate: opportunity.startDate ? new Date(opportunity.startDate).toISOString().split('T')[0] : "",
      endDate: opportunity.endDate ? new Date(opportunity.endDate).toISOString().split('T')[0] : "",
      volunteersNeeded: opportunity.volunteersNeeded || 1,
      category: opportunity.category || "",
      benefits: opportunity.benefits || "",
      requirements: opportunity.requirements || "",
      status: (opportunity.status as "open" | "closed" | "filled") || "open",
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: OpportunityFormValues) => {
      return apiRequest("PATCH", `/api/opportunities/${opportunity.id}`, {
        ...data,
        requiredSkills: data.requiredSkills
          ? data.requiredSkills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update opportunity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OpportunityFormValues) => {
    editMutation.mutate(data);
  };

  const isRemote = form.watch("isRemote");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-edit-opportunity-${opportunity.id}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Opportunity</DialogTitle>
          <DialogDescription>
            Update the volunteer opportunity details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Opportunity Title <span className="text-red-500">*</span></Label>
              <Input
                id="edit-title"
                {...form.register("title")}
                placeholder="e.g., Community Health Volunteer"
                data-testid="input-edit-opportunity-title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-description">Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="edit-description"
                {...form.register("description")}
                rows={4}
                placeholder="Describe the volunteer role, responsibilities, and impact..."
                data-testid="textarea-edit-opportunity-description"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select 
                value={form.watch("category")}
                onValueChange={(value) => form.setValue("category", value)}
              >
                <SelectTrigger data-testid="select-edit-opportunity-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="community">Community Development</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-requiredSkills">Required Skills</Label>
              <Input
                id="edit-requiredSkills"
                {...form.register("requiredSkills")}
                placeholder="e.g., First Aid, Teaching, Communication (comma-separated)"
                data-testid="input-edit-required-skills"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isRemote"
                checked={isRemote}
                onCheckedChange={(checked) => form.setValue("isRemote", checked)}
                data-testid="switch-edit-is-remote"
              />
              <Label htmlFor="edit-isRemote">This is a remote opportunity</Label>
            </div>

            {!isRemote && (
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  {...form.register("location")}
                  placeholder="e.g., Nairobi, Kenya"
                  data-testid="input-edit-location"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-timeCommitment">Time Commitment</Label>
              <Input
                id="edit-timeCommitment"
                {...form.register("timeCommitment")}
                placeholder="e.g., 10 hours/week"
                data-testid="input-edit-time-commitment"
              />
            </div>

            <div>
              <Label htmlFor="edit-volunteersNeeded">Volunteers Needed</Label>
              <Input
                id="edit-volunteersNeeded"
                type="number"
                {...form.register("volunteersNeeded", { valueAsNumber: true })}
                min={1}
                data-testid="input-edit-volunteers-needed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                {...form.register("startDate")}
                data-testid="input-edit-start-date"
              />
            </div>

            <div>
              <Label htmlFor="edit-endDate">End Date</Label>
              <Input
                id="edit-endDate"
                type="date"
                {...form.register("endDate")}
                data-testid="input-edit-end-date"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-benefits">Benefits for Volunteers</Label>
              <Textarea
                id="edit-benefits"
                {...form.register("benefits")}
                rows={3}
                placeholder="What will volunteers gain from this experience?"
                data-testid="textarea-edit-benefits"
              />
            </div>

            <div>
              <Label htmlFor="edit-requirements">Additional Requirements</Label>
              <Textarea
                id="edit-requirements"
                {...form.register("requirements")}
                rows={3}
                placeholder="Any specific requirements, certifications, or qualifications needed?"
                data-testid="textarea-edit-requirements"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-status">Status</Label>
            <Select 
              value={form.watch("status")}
              onValueChange={(value) => form.setValue("status", value as "open" | "closed" | "filled")}
            >
              <SelectTrigger data-testid="select-edit-opportunity-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={editMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editMutation.isPending}
              data-testid="button-submit-edit"
            >
              {editMutation.isPending ? "Updating..." : "Update Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteOpportunityDialogProps {
  opportunity: Opportunity;
}

export function DeleteOpportunityDialog({ opportunity }: DeleteOpportunityDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/opportunities/${opportunity.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Success",
        description: "Opportunity deleted successfully",
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete opportunity",
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-delete-opportunity-${opportunity.id}`}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{opportunity.title}"? This will also remove all applications for this opportunity. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending} data-testid="button-cancel-delete">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-red-500 hover:bg-red-600"
            data-testid="button-confirm-delete"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

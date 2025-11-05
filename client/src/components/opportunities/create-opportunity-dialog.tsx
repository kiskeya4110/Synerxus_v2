import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const opportunitySchema = z.object({
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
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateOpportunityDialog({ open, onOpenChange }: CreateOpportunityDialogProps) {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      isRemote: false,
      volunteersNeeded: 1,
    },
  });

  const isRemote = watch("isRemote");

  const createMutation = useMutation({
    mutationFn: async (data: OpportunityFormData) => {
      const payload = {
        ...data,
        requiredSkills: data.requiredSkills ? data.requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
        organizationId: 1, // TODO: Get from auth context
      };
      return await apiRequest("POST", "/api/opportunities", payload);
    },
    onSuccess: () => {
      toast({
        title: "Opportunity Posted!",
        description: "Your volunteer opportunity has been posted successfully.",
      });
      const userId = localStorage.getItem('currentUserId');
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Post",
        description: error.message || "Failed to create opportunity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OpportunityFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Post Volunteer Opportunity</DialogTitle>
          <DialogDescription>
            Create a new volunteer opportunity to connect with passionate volunteers worldwide
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Opportunity Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="e.g., Community Health Volunteer"
                data-testid="input-opportunity-title"
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                {...register("description")}
                rows={4}
                placeholder="Describe the volunteer role, responsibilities, and impact..."
                data-testid="textarea-opportunity-description"
              />
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => setValue("category", value)}>
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
                {...register("requiredSkills")}
                placeholder="e.g., First Aid, Teaching, Communication (comma-separated)"
                data-testid="input-required-skills"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isRemote"
                checked={isRemote}
                onCheckedChange={(checked) => setValue("isRemote", checked)}
                data-testid="switch-is-remote"
              />
              <Label htmlFor="isRemote">This is a remote opportunity</Label>
            </div>

            {!isRemote && (
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="e.g., Nairobi, Kenya"
                  data-testid="input-location"
                />
              </div>
            )}
          </div>

          {/* Time Commitment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeCommitment">Time Commitment</Label>
              <Input
                id="timeCommitment"
                {...register("timeCommitment")}
                placeholder="e.g., 10 hours/week"
                data-testid="input-time-commitment"
              />
            </div>

            <div>
              <Label htmlFor="volunteersNeeded">Volunteers Needed</Label>
              <Input
                id="volunteersNeeded"
                type="number"
                {...register("volunteersNeeded", { valueAsNumber: true })}
                min={1}
                data-testid="input-volunteers-needed"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate")}
                data-testid="input-start-date"
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate")}
                data-testid="input-end-date"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="benefits">Benefits for Volunteers</Label>
              <Textarea
                id="benefits"
                {...register("benefits")}
                rows={3}
                placeholder="What will volunteers gain from this experience?"
                data-testid="textarea-benefits"
              />
            </div>

            <div>
              <Label htmlFor="requirements">Additional Requirements</Label>
              <Textarea
                id="requirements"
                {...register("requirements")}
                rows={3}
                placeholder="Any specific requirements, certifications, or qualifications needed?"
                data-testid="textarea-requirements"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
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

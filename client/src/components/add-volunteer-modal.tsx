import { useState } from "react";
import { X, Mail, Upload, UserPlus, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AddVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: number;
  projectId?: number;
}

interface InvitationData {
  email: string;
  role: "volunteer" | "team-lead" | "specialist";
  projectId?: number;
  message?: string;
}

export function AddVolunteerModal({
  isOpen,
  onClose,
  organizationId,
  projectId,
}: AddVolunteerModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // Single invitation state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"volunteer" | "team-lead" | "specialist">("volunteer");
  const [selectedProject, setSelectedProject] = useState<string>(projectId?.toString() || "");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Pending invitations state
  const [pendingInvitations, setPendingInvitations] = useState<InvitationData[]>([]);

  if (!isOpen) return null;

  const handleSingleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate email
      if (!email || !email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      const invitationData: InvitationData = {
        email,
        role,
        projectId: selectedProject ? parseInt(selectedProject) : undefined,
        message: customMessage,
      };

      // Send invitation API call
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...invitationData,
          organizationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send invitation");
      }

      // Add to pending invitations
      setPendingInvitations([...pendingInvitations, invitationData]);

      toast({
        title: "Invitation sent!",
        description: `Invitation email sent to ${email}`,
      });

      // Reset form
      setEmail("");
      setCustomMessage("");

    } catch (error: any) {
      toast({
        title: "Invitation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!csvFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("organizationId", organizationId?.toString() || "");
      formData.append("defaultRole", role);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/invitations/bulk-import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import volunteers");
      }

      const result = await response.json();

      toast({
        title: "Import successful!",
        description: `${result.count} invitations sent successfully`,
      });

      setCsvFile(null);
      setUploadProgress(0);

    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "email,role,project\nexample@email.com,volunteer,Project Name\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "volunteer-import-template.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-900 to-green-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Invite Volunteers</h2>
              <p className="text-sm text-white/80">Send invitations to join your organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white transition-colors rounded-lg hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("single")}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === "single"
                ? "text-blue-900 border-b-2 border-blue-900 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              Single Invitation
            </div>
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === "bulk"
                ? "text-blue-900 border-b-2 border-blue-900 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              Bulk Import
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "single" && (
            <form onSubmit={handleSingleInvite} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="volunteer@example.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="volunteer">Project Volunteer</option>
                  <option value="team-lead">Team Lead</option>
                  <option value="specialist">Specialist</option>
                </select>
              </div>

              {/* Project Assignment */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Assign to Project (Optional)
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No project assignment</option>
                  <option value="1">Healthcare Initiative</option>
                  <option value="2">Education Program</option>
                  <option value="3">Environmental Project</option>
                </select>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal note to the invitation..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 text-white transition-all btn-primary-gradient"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Mail className="w-5 h-5" />
                    Send Invitation
                  </span>
                )}
              </Button>
            </form>
          )}

          {activeTab === "bulk" && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="p-4 border-l-4 border-blue-500 rounded-lg bg-blue-50">
                <h4 className="mb-2 font-semibold text-blue-900">How to use bulk import:</h4>
                <ol className="space-y-1 text-sm text-blue-800 list-decimal list-inside">
                  <li>Download the CSV template below</li>
                  <li>Fill in volunteer emails and details</li>
                  <li>Upload the completed CSV file</li>
                  <li>Review and confirm the import</li>
                </ol>
              </div>

              {/* Download Template */}
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-900 transition-colors border-2 border-blue-300 rounded-lg hover:bg-blue-50"
              >
                <Upload className="w-4 h-4" />
                Download CSV Template
              </button>

              {/* File Upload */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                  />
                </div>
                {csvFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Uploading...</span>
                    <span className="font-medium text-blue-900">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                    <div
                      className="h-full transition-all duration-300 bg-gradient-to-r from-blue-900 to-green-600"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Import Button */}
              <Button
                onClick={handleBulkImport}
                disabled={!csvFile || isSubmitting}
                className="w-full py-3 text-white transition-all btn-primary-gradient"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                    Importing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    Import Volunteers
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">
                Pending Invitations ({pendingInvitations.length})
              </h3>
            </div>
            <div className="space-y-2">
              {pendingInvitations.slice(-3).map((inv, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{inv.email}</p>
                    <p className="text-sm text-gray-600">Role: {inv.role}</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

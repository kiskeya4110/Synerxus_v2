import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileImage,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye
} from "lucide-react";

interface IngestedData {
  mapped_fields: {
    total_hours: number;
    employees_engaged: number;
    projects_completed: number;
    sdg_score: number;
    volunteers: number;
    organizations: number;
    sdgs: number[];
    confidence_scores: { [key: string]: number };
  };
  confidence: number;
  extracted_text: string;
  metadata: {
    filename: string;
    content_type: string;
    ingestion_timestamp: string;
    image_size: number;
    requires_review: boolean;
  };
}

interface ImageIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataAccepted?: (data: any) => void;
}

export default function ImageIngestionModal({
  isOpen,
  onClose,
  onDataAccepted
}: ImageIngestionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ingestedData, setIngestedData] = useState<IngestedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [editedValues, setEditedValues] = useState<{ [key: string]: any }>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setIngestedData(null);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Call image ingestion API (uses relative path for production compatibility)
      const response = await fetch("/api/images/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data: IngestedData = await response.json();
      setIngestedData(data);

      // Initialize edited values with ingested data
      setEditedValues({ ...data.mapped_fields });
    } catch (err: any) {
      setError(err.message || "Failed to ingest image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleValueChange = (field: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAccept = () => {
    if (ingestedData && onDataAccepted) {
      onDataAccepted({
        ...editedValues,
        metadata: ingestedData.metadata,
        original_confidence: ingestedData.confidence
      });
    }
    handleClose();
  };

  const handleReject = () => {
    setIngestedData(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditedValues({});
  };

  const handleClose = () => {
    setIngestedData(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditedValues({});
    setError(null);
    setShowExtractedText(false);
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-green-600";
    if (confidence >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.7) return { icon: CheckCircle, label: "High Confidence", color: "bg-green-100 text-green-800" };
    if (confidence >= 0.5) return { icon: AlertTriangle, label: "Medium Confidence", color: "bg-yellow-100 text-yellow-800" };
    return { icon: XCircle, label: "Low Confidence", color: "bg-red-100 text-red-800" };
  };

  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileImage className="h-6 w-6 text-blue-600" />
            Dashboard Screenshot Ingestion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          {!ingestedData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Dashboard Screenshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upload & Process"
                    )}
                  </Button>
                </div>

                {previewUrl && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded border"
                    />
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Review Section */}
          {ingestedData && (
            <>
              {/* Confidence Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Ingestion Results</span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const badge = getConfidenceBadge(ingestedData.confidence);
                        const Icon = badge.icon;
                        return (
                          <>
                            <span className={`text-sm px-3 py-1 rounded-full ${badge.color}`}>
                              <Icon className="h-4 w-4 inline mr-1" />
                              {badge.label}
                            </span>
                            <span className={`text-2xl font-bold ${getConfidenceColor(ingestedData.confidence)}`}>
                              {(ingestedData.confidence * 100).toFixed(0)}%
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ingestedData.metadata.requires_review && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Manual review required due to low confidence score. Please verify the extracted values below.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Extracted Data Review */}
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Values - Please Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(ingestedData.mapped_fields).map(([field, value]) => {
                      if (field === 'confidence_scores') return null;

                      const confidence = ingestedData.mapped_fields.confidence_scores[field] || 0;
                      const isArray = Array.isArray(value);

                      return (
                        <div key={field} className="space-y-2">
                          <label className="text-sm font-medium flex items-center justify-between">
                            <span>{formatFieldName(field)}</span>
                            <span className={`text-xs ${getConfidenceColor(confidence)}`}>
                              {(confidence * 100).toFixed(0)}% confidence
                            </span>
                          </label>
                          {isArray ? (
                            <Input
                              value={editedValues[field]?.join(", ") || ""}
                              onChange={(e) => handleValueChange(
                                field,
                                e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n))
                              )}
                              placeholder="e.g., 4, 8, 10"
                            />
                          ) : (
                            <Input
                              type="number"
                              value={editedValues[field] || ""}
                              onChange={(e) => handleValueChange(field, parseFloat(e.target.value))}
                              step={field === 'sdg_score' ? 0.1 : 1}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Show Extracted Text Toggle */}
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExtractedText(!showExtractedText)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showExtractedText ? "Hide" : "Show"} Raw OCR Text
                    </Button>

                    {showExtractedText && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border text-xs font-mono max-h-40 overflow-y-auto">
                        {ingestedData.extracted_text}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleReject}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject & Try Again
                </Button>
                <Button onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept & Save Data
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

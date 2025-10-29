"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Upload, 
  AlertTriangle,
  Shield,
  RefreshCw,
  Eye,
  Download
} from "lucide-react";
import { toast } from "sonner";

// Types
interface Verification {
  id: string;
  verification_type: 'identity' | 'insurance' | 'medical_history' | 'emergency_contact';
  status: 'pending' | 'approved' | 'rejected' | 'requires_update';
  verified_by?: string;
  verification_date?: string;
  rejection_reason?: string;
  required_documents: string[];
  submitted_documents: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  documents?: Document[];
}

interface Document {
  id: string;
  verification_id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  verified_at?: string;
  verified_by?: string;
}

export default function PatientVerificationStatus() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch patient's verifications
  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patient-verifications');
      if (!response.ok) throw new Error('Failed to fetch verifications');
      
      const data = await response.json();
      setVerifications(data.verifications || []);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  // Calculate verification progress
  const getVerificationProgress = () => {
    if (verifications.length === 0) return 0;
    const approved = verifications.filter(v => v.status === 'approved').length;
    return Math.round((approved / verifications.length) * 100);
  };

  // Get overall status
  const getOverallStatus = () => {
    if (verifications.length === 0) return 'not_started';
    
    const approved = verifications.filter(v => v.status === 'approved').length;
    const rejected = verifications.filter(v => v.status === 'rejected').length;
    const pending = verifications.filter(v => v.status === 'pending').length;

    if (approved === verifications.length) return 'fully_verified';
    if (rejected > 0) return 'has_rejections';
    if (pending > 0) return 'pending_verification';
    return 'not_started';
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'requires_update': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get overall status badge color
  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'fully_verified': return 'bg-green-100 text-green-800';
      case 'has_rejections': return 'bg-red-100 text-red-800';
      case 'pending_verification': return 'bg-yellow-100 text-yellow-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (verificationId: string, file: File) => {
    try {
      // In a real implementation, you would upload the file to a storage service
      // For now, we'll simulate the upload
      const mockFileUrl = `https://example.com/uploads/${file.name}`;
      
      const response = await fetch('/api/patient-verifications/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_id: verificationId,
          document_type: 'uploaded_document',
          document_name: file.name,
          file_url: mockFileUrl,
          file_size: file.size,
          mime_type: file.type,
        }),
      });

      if (!response.ok) throw new Error('Failed to upload document');

      toast.success('Document uploaded successfully');
      fetchVerifications();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  const overallStatus = getOverallStatus();
  const progress = getVerificationProgress();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading verification status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </h2>
          <p className="text-gray-600">Your account verification progress</p>
        </div>
        <Button onClick={fetchVerifications} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Verification Status</span>
            <Badge className={getOverallStatusColor(overallStatus)}>
              {overallStatus.replace('_', ' ')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {verifications.filter(v => v.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {verifications.filter(v => v.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {verifications.filter(v => v.status === 'rejected').length}
                </div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {verifications.filter(v => v.status === 'requires_update').length}
                </div>
                <div className="text-sm text-gray-600">Needs Update</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Items */}
      <div className="space-y-4">
        {verifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Verifications Required</h3>
              <p className="text-gray-600">Your account is fully verified and ready to use.</p>
            </CardContent>
          </Card>
        ) : (
          verifications.map((verification) => (
            <Card key={verification.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium capitalize">
                        {verification.verification_type.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Created {new Date(verification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadgeColor(verification.status)}>
                      {verification.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVerification(verification);
                        setIsDetailOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Required Documents */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Required Documents:</h4>
                  <div className="flex flex-wrap gap-2">
                    {verification.required_documents.map((doc, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {doc}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Submitted Documents */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Submitted Documents:</h4>
                  {verification.submitted_documents.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {verification.submitted_documents.map((doc, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No documents submitted yet</p>
                  )}
                </div>

                {/* Rejection Reason */}
                {verification.rejection_reason && (
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Rejection Reason:</strong> {verification.rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {verification.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id={`upload-${verification.id}`}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleDocumentUpload(verification.id, file);
                          }
                        }}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`upload-${verification.id}`)?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  )}
                  
                  {verification.status === 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // In a real implementation, this would open a resubmission form
                        toast.info('Resubmission form would open here');
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Resubmit Documents
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold capitalize">
                  {selectedVerification.verification_type.replace('_', ' ')} Details
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <Badge className={getStatusBadgeColor(selectedVerification.status)}>
                    {selectedVerification.status}
                  </Badge>
                </div>

                {selectedVerification.verification_date && (
                  <div>
                    <h4 className="font-medium mb-1">Verified On</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedVerification.verification_date).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedVerification.notes && (
                  <div>
                    <h4 className="font-medium mb-1">Notes</h4>
                    <p className="text-sm text-gray-600">{selectedVerification.notes}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Required Documents</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVerification.required_documents.map((doc, index) => (
                      <Badge key={index} variant="outline">{doc}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Submitted Documents</h4>
                  {selectedVerification.submitted_documents.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedVerification.submitted_documents.map((doc, index) => (
                        <Badge key={index} variant="secondary">{doc}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No documents submitted</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

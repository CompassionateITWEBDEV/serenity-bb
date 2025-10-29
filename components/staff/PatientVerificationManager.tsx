"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Upload, 
  Eye,
  User,
  Shield,
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  Plus
} from "lucide-react";
import { toast } from "sonner";

// Types
interface Patient {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  avatar?: string;
  overall_status: 'fully_verified' | 'has_rejections' | 'pending_verification' | 'not_started';
  total_verifications: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  last_updated: string;
}

interface Verification {
  id: string;
  patient_id: string;
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
  verified_by_user?: {
    id: string;
    email: string;
    raw_user_meta_data: any;
  };
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

export default function PatientVerificationManager() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [migrationRequired, setMigrationRequired] = useState(false);

  // Check migration status
  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/check-migration');
      const data = await response.json();
      
      if (data.migrationRequired) {
        setMigrationRequired(true);
        console.log('Migration required:', data);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  };

  // Fetch patients with verification summary
  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // First check if migration is required
      const migrationReady = await checkMigrationStatus();
      if (!migrationReady) {
        return;
      }
      
      const response = await fetch('/api/patient-verifications/summary');
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle migration required error
        if (response.status === 503 && errorData.migration_required) {
          setMigrationRequired(true);
          toast.error('Patient verification system needs to be initialized. Please contact your administrator.');
          console.error('Migration required:', errorData);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to fetch patients');
      }
      
      const data = await response.json();
      setPatients(data.summaries || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  // Fetch verifications for selected patients
  const fetchVerifications = async (patientIds: string[]) => {
    if (patientIds.length === 0) {
      setVerifications([]);
      return;
    }

    try {
      const promises = patientIds.map(patientId => 
        fetch(`/api/patient-verifications?patient_id=${patientId}`)
      );
      const responses = await Promise.all(promises);
      const data = await Promise.all(responses.map(r => r.json()));
      
      const allVerifications = data.flatMap(d => d.verifications || []);
      setVerifications(allVerifications);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Failed to fetch verifications');
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchVerifications(selectedPatients);
  }, [selectedPatients]);

  // Filter patients based on search and status
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || patient.overall_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle patient selection
  const handlePatientSelect = (patientId: string, checked: boolean) => {
    if (checked) {
      setSelectedPatients(prev => [...prev, patientId]);
    } else {
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPatients(filteredPatients.map(p => p.id));
    } else {
      setSelectedPatients([]);
    }
  };

  // Handle verification status update
  const handleStatusUpdate = async (verificationId: string, status: string, rejectionReason?: string) => {
    try {
      const response = await fetch(`/api/patient-verifications?id=${verificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          rejection_reason: rejectionReason 
        }),
      });

      if (!response.ok) throw new Error('Failed to update verification');

      // Send notification to patient
      await fetch('/api/patient-verifications/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_id: verificationId,
          notification_type: status,
          message: rejectionReason || `Your verification has been ${status}`,
        }),
      });

      toast.success('Verification status updated and notification sent');
      fetchVerifications(selectedPatients);
      fetchPatients(); // Refresh summary
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification');
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedPatients.length === 0) return;

    try {
      // Create verifications for selected patients
      const promises = selectedPatients.map(patientId => 
        fetch('/api/patient-verifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: patientId,
            verification_type: bulkAction,
            required_documents: getRequiredDocuments(bulkAction),
          }),
        })
      );

      await Promise.all(promises);
      toast.success(`Created ${bulkAction} verifications for ${selectedPatients.length} patients`);
      setIsBulkActionOpen(false);
      setBulkAction("");
      fetchPatients();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  // Get required documents for verification type
  const getRequiredDocuments = (type: string): string[] => {
    const documentMap: Record<string, string[]> = {
      identity: ['Government ID', 'Proof of Address'],
      insurance: ['Insurance Card', 'Policy Document'],
      medical_history: ['Medical Records', 'Prescription History'],
      emergency_contact: ['Emergency Contact ID', 'Relationship Proof'],
    };
    return documentMap[type] || [];
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'fully_verified': return 'bg-green-100 text-green-800';
      case 'has_rejections': return 'bg-red-100 text-red-800';
      case 'pending_verification': return 'bg-yellow-100 text-yellow-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get verification status badge color
  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'requires_update': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading patients...</span>
      </div>
    );
  }

  if (migrationRequired) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Patient Verification</h1>
            <p className="text-gray-600">Manage patient verification status and documents</p>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium">Patient verification system not initialized</p>
              <p>The database tables required for patient verification have not been created yet.</p>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-sm mb-2">To fix this issue:</p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Go to your Supabase dashboard</li>
                  <li>Navigate to SQL Editor</li>
                  <li>Copy the contents of <code className="bg-gray-200 px-1 rounded">scripts/create_patient_verification_system.sql</code></li>
                  <li>Paste and execute the SQL</li>
                  <li>Verify tables are created successfully</li>
                </ol>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={fetchPatients} 
                  variant="outline" 
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Again
                </Button>
                <Button 
                  onClick={() => window.open('/api/admin/check-migration', '_blank')} 
                  variant="outline" 
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Check Migration Status
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patient Verification</h1>
          <p className="text-gray-600">Manage patient verification status and documents</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsBulkActionOpen(true)}
            disabled={selectedPatients.length === 0}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Bulk Action ({selectedPatients.length})
          </Button>
          <Button onClick={fetchPatients} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="fully_verified">Fully Verified</SelectItem>
                <SelectItem value="pending_verification">Pending</SelectItem>
                <SelectItem value="has_rejections">Has Rejections</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patients ({filteredPatients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Select All */}
            <div className="flex items-center gap-3 p-3 border-b">
              <Checkbox
                checked={selectedPatients.length === filteredPatients.length && filteredPatients.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="font-medium">Select All</span>
            </div>

            {/* Patient Items */}
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedPatients.includes(patient.id)}
                  onCheckedChange={(checked) => handlePatientSelect(patient.id, checked as boolean)}
                />
                
                <div className="flex-1 flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </h3>
                      <Badge className={getStatusBadgeColor(patient.overall_status)}>
                        {patient.overall_status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{patient.email}</p>
                    <div className="flex gap-4 text-xs text-gray-500 mt-1">
                      <span>Total: {patient.total_verifications}</span>
                      <span>Approved: {patient.approved_count}</span>
                      <span>Pending: {patient.pending_count}</span>
                      <span>Rejected: {patient.rejected_count}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPatients([patient.id]);
                    setIsDetailOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            ))}

            {filteredPatients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No patients found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification Details Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
          </DialogHeader>
          
          {verifications.length > 0 && (
            <div className="space-y-4">
              {verifications.map((verification) => (
                <Card key={verification.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        <h3 className="font-medium capitalize">
                          {verification.verification_type.replace('_', ' ')}
                        </h3>
                        <Badge className={getVerificationStatusColor(verification.status)}>
                          {verification.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(verification.id, 'approved')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(verification.id, 'rejected', 'Please provide additional documentation')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">Required Documents:</h4>
                        <div className="flex flex-wrap gap-2">
                          {verification.required_documents.map((doc, index) => (
                            <Badge key={index} variant="outline">{doc}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Submitted Documents:</h4>
                        {verification.submitted_documents.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {verification.submitted_documents.map((doc, index) => (
                              <Badge key={index} variant="secondary">{doc}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No documents submitted yet</p>
                        )}
                      </div>

                      {verification.rejection_reason && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Rejection Reason:</strong> {verification.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}

                      {verification.notes && (
                        <div>
                          <h4 className="font-medium mb-1">Notes:</h4>
                          <p className="text-sm text-gray-600">{verification.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Modal */}
      <Dialog open={isBulkActionOpen} onOpenChange={setIsBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Action</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Action for {selectedPatients.length} selected patients:
              </label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identity">Create Identity Verification</SelectItem>
                  <SelectItem value="insurance">Create Insurance Verification</SelectItem>
                  <SelectItem value="medical_history">Create Medical History Verification</SelectItem>
                  <SelectItem value="emergency_contact">Create Emergency Contact Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBulkActionOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAction} disabled={!bulkAction}>
                Execute Action
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

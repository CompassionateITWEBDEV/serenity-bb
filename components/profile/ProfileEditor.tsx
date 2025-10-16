"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Save, 
  X, 
  Edit3, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Camera,
  Upload
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const ProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  treatmentType: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

type ProfileData = z.infer<typeof ProfileSchema>;

interface ProfileEditorProps {
  initialData?: Partial<ProfileData>;
  onSave?: (data: ProfileData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  onEditToggle?: () => void;
}

export default function ProfileEditor({ 
  initialData, 
  onSave, 
  onCancel, 
  isEditing = false,
  onEditToggle 
}: ProfileEditorProps) {
  const [formData, setFormData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    treatmentType: "Outpatient",
    bio: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Load current user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: patientData } = await supabase
            .from("patients")
            .select("*")
            .eq("user_id", session.user.id)
            .single();

          if (patientData) {
            setFormData({
              firstName: patientData.first_name || "",
              lastName: patientData.last_name || "",
              email: patientData.email || session.user.email || "",
              phone: patientData.phone_number || "",
              dateOfBirth: patientData.date_of_birth || "",
              address: patientData.address || "",
              emergencyContactName: patientData.emergency_contact_name || "",
              emergencyContactPhone: patientData.emergency_contact_phone || "",
              emergencyContactRelationship: patientData.emergency_contact_relationship || "",
              treatmentType: patientData.treatment_type || "Outpatient",
              bio: patientData.bio || "",
            });
            setAvatar(patientData.avatar_url || null);
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, []);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    try {
      ProfileSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setStatus({ type: "error", message: "Please fix the errors below" });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      if (onSave) {
        await onSave(formData);
      } else {
        // Default save behavior
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Not authenticated");

        // Extract avatar path from URL if it's a storage URL
        let avatarPath = null;
        if (avatar) {
          // If it's a storage URL, extract the path
          const url = new URL(avatar);
          if (url.pathname.includes('/storage/v1/object/public/avatars/')) {
            avatarPath = url.pathname.split('/storage/v1/object/public/avatars/')[1];
          } else {
            // If it's not a storage URL, keep it as is (for external URLs)
            avatarPath = avatar;
          }
        }

        const { error } = await supabase
          .from("patients")
          .upsert({
            user_id: session.user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone_number: formData.phone,
            date_of_birth: formData.dateOfBirth || null,
            address: formData.address || null,
            emergency_contact_name: formData.emergencyContactName || null,
            emergency_contact_phone: formData.emergencyContactPhone || null,
            emergency_contact_relationship: formData.emergencyContactRelationship || null,
            treatment_type: formData.treatmentType || null,
            bio: formData.bio || null,
            avatar_url: avatarPath,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (error) throw error;
      }

      setStatus({ type: "success", message: "Profile updated successfully!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setStatus({ 
        type: "error", 
        message: error instanceof Error ? error.message : "Failed to save profile" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Reset form to initial data
      if (initialData) {
        setFormData(prev => ({ ...prev, ...initialData }));
      }
    }
    setErrors({});
    setStatus(null);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setStatus({ type: "error", message: "Please upload a PNG, JPG, or WebP image" });
      return;
    }
    if (file.size > 1_000_000) {
      setStatus({ type: "error", message: "Image must be 1MB or smaller" });
      return;
    }

    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Not authenticated");
      }

      // Create user-scoped file path
      const fileExt = file.name.split('.').pop();
      const safeFileName = file.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${session.user.id}/${Date.now()}-${safeFileName}`;

      // Upload to user's folder in avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatar(publicUrl);
      setStatus({ type: "success", message: "Avatar uploaded successfully!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setStatus({ 
        type: "error", 
        message: error instanceof Error ? error.message : "Failed to upload avatar" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {status && (
        <Alert className={status.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          <AlertDescription className={status.type === "error" ? "text-red-800" : "text-green-800"}>
            {status.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Profile Information</CardTitle>
              <CardDescription>Manage your personal information and preferences</CardDescription>
            </div>
            {!isEditing && onEditToggle && (
              <Button onClick={onEditToggle} className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatar || ""} alt="Profile" />
                <AvatarFallback className="text-2xl">
                  {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                </label>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {formData.firstName} {formData.lastName}
              </h3>
              <p className="text-slate-600">{formData.email}</p>
              <Badge variant="outline" className="mt-2">
                {formData.treatmentType}
              </Badge>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    disabled={!isEditing}
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    disabled={!isEditing}
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={!isEditing}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    disabled={!isEditing}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Contact & Treatment Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Contact & Treatment
              </h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="treatmentType">Treatment Type</Label>
                  <Select
                    value={formData.treatmentType}
                    onValueChange={(value) => handleInputChange("treatmentType", value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select treatment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Outpatient">Outpatient</SelectItem>
                      <SelectItem value="Inpatient">Inpatient</SelectItem>
                      <SelectItem value="Intensive Outpatient">Intensive Outpatient</SelectItem>
                      <SelectItem value="Partial Hospitalization">Partial Hospitalization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.bio?.length || 0}/500 characters
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Emergency Contact
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                <Select
                  value={formData.emergencyContactRelationship}
                  onValueChange={(value) => handleInputChange("emergencyContactRelationship", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Friend">Friend</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 pt-6 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

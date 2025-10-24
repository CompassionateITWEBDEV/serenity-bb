"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Search,
  Plus,
  X,
  Users,
  MessageCircle,
  Phone,
  Video,
} from "lucide-react";
import EnhancedChatBox from "@/components/chat/EnhancedChatBox";

export default function EnhancedMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [me, setMe] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [staffDir, setStaffDir] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMe({ id: user.id, name: user.user_metadata?.full_name, email: user.email });
      }
    };
    getCurrentUser();
  }, []);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!me?.id) return;
      
      try {
        setIsLoading(true);
        
        // Get conversations where user is either patient or provider
        const { data: convs, error } = await supabase
          .from("conversations")
          .select(`
            id,
            patient_id,
            provider_id,
            provider_name,
            provider_role,
            last_message,
            last_message_at,
            created_at,
            patients!conversations_patient_id_fkey (
              id,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .or(`patient_id.eq.${me.id},provider_id.eq.${me.id}`)
          .order("last_message_at", { ascending: false });

        if (error) {
          console.error("Error loading conversations:", error);
          return;
        }

        setConversations(convs || []);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [me?.id]);

  // Load staff directory
  useEffect(() => {
    const loadStaffDirectory = async () => {
      try {
        const { data: staff, error } = await supabase
          .from("staff")
          .select("user_id, first_name, last_name, role, department, avatar_url");

        if (error) {
          console.error("Error loading staff directory:", error);
          return;
        }

        const staffMap: Record<string, any> = {};
        staff?.forEach((member) => {
          staffMap[member.user_id] = member;
        });
        setStaffDir(staffMap);
      } catch (error) {
        console.error("Error loading staff directory:", error);
      }
    };

    loadStaffDirectory();
  }, []);

  // Get selected conversation
  const selectedConv = useMemo(() => {
    return conversations.find(c => c.id === selectedId);
  }, [conversations, selectedId]);

  // Get provider info for selected conversation
  const providerInfo = useMemo(() => {
    if (!selectedConv?.provider_id) return { id: "", name: "", role: "", avatar: "" };
    
    const staff = staffDir[selectedConv.provider_id];
    return {
      id: selectedConv.provider_id,
      name: staff ? `${staff.first_name} ${staff.last_name}`.trim() : selectedConv.provider_name || "Staff",
      role: staff?.role || selectedConv.provider_role || "Staff",
      avatar: staff?.avatar_url || undefined,
    };
  }, [selectedConv, staffDir]);

  // Get patient info for selected conversation
  const patientInfo = useMemo(() => {
    if (!selectedConv?.patients) return { id: "", name: "", avatar: "" };
    
    const patient = selectedConv.patients;
    return {
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`.trim(),
      avatar: patient.avatar_url || undefined,
    };
  }, [selectedConv]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const patientName = conv.patients ? 
        `${conv.patients.first_name} ${conv.patients.last_name}`.toLowerCase() : "";
      const providerName = conv.provider_name?.toLowerCase() || "";
      const lastMessage = conv.last_message?.toLowerCase() || "";
      
      return patientName.includes(query) || 
             providerName.includes(query) || 
             lastMessage.includes(query);
    });
  }, [conversations, searchQuery]);

  // Handle conversation selection
  const handleConversationSelect = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Conversations List */}
        <div className="w-80 bg-white border-r flex flex-col">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleConversationSelect(conv.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 border-l-4 transition-colors ${
                      selectedId === conv.id 
                        ? "border-l-blue-500 bg-blue-50" 
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={conv.patients?.avatar_url || undefined} />
                        <AvatarFallback>
                          {conv.patients ? 
                            `${conv.patients.first_name} ${conv.patients.last_name}`.charAt(0).toUpperCase() :
                            "P"
                          }
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 truncate">
                            {conv.patients ? 
                              `${conv.patients.first_name} ${conv.patients.last_name}`.trim() :
                              "Patient"
                            }
                          </h3>
                          {conv.last_message_at && (
                            <span className="text-xs text-gray-500">
                              {new Date(conv.last_message_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conv.last_message || "No messages yet"}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {conv.provider_role || "Staff"}
                          </Badge>
                          {conv.provider_name && (
                            <span className="text-xs text-gray-500">
                              with {conv.provider_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Chat */}
        <div className="flex-1 flex flex-col">
          {selectedId && selectedConv ? (
            <EnhancedChatBox
              conversationId={selectedId}
              patientId={selectedConv.patient_id}
              providerId={selectedConv.provider_id}
              providerName={providerInfo.name}
              providerRole={providerInfo.role}
              providerAvatarUrl={providerInfo.avatar}
              patientName={patientInfo.name}
              patientAvatarUrl={patientInfo.avatar}
              mode="staff"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


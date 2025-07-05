import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, UserPlus, Globe, Lock, Users, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: number;
    title: string;
    visibility: string;
    authorId: number;
  };
  permissions: Array<{
    id: number;
    userId: number;
    permission: string;
    user: {
      id: number;
      username: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  }>;
}

export function ShareModal({ open, onOpenChange, document, permissions }: ShareModalProps) {
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState("");
  const [userPermission, setUserPermission] = useState("view");
  const [newVisibility, setNewVisibility] = useState(document.visibility);

  const { data: userSearchResults } = useQuery({
    queryKey: ["/api/users/search", userEmail],
    queryFn: async () => {
      if (!userEmail || userEmail.length < 2) return [];
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(userEmail)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to search users");
      return response.json();
    },
    enabled: !!userEmail && userEmail.length >= 2,
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (visibility: string) => {
      const response = await apiRequest("PUT", `/api/documents/${document.id}`, {
        visibility,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", document.id.toString()] });
      toast({
        title: "Visibility updated",
        description: "Document visibility has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update document visibility.",
        variant: "destructive",
      });
    },
  });

  const addPermissionMutation = useMutation({
    mutationFn: async (data: { userId: number; permission: string }) => {
      const response = await apiRequest("POST", `/api/documents/${document.id}/permissions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", document.id.toString(), "permissions"] });
      setUserEmail("");
      setUserPermission("view");
      toast({
        title: "User added",
        description: "User has been granted access to the document.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add user. They may already have access.",
        variant: "destructive",
      });
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/documents/${document.id}/permissions/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", document.id.toString(), "permissions"] });
      toast({
        title: "Access removed",
        description: "User's access has been removed from the document.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove user access.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateVisibility = async () => {
    if (newVisibility !== document.visibility) {
      await updateVisibilityMutation.mutateAsync(newVisibility);
    }
  };

  const handleAddUser = async (userId: number) => {
    await addPermissionMutation.mutateAsync({
      userId,
      permission: userPermission,
    });
  };

  const handleRemoveUser = async (userId: number) => {
    await removePermissionMutation.mutateAsync(userId);
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'space':
        return <Users className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  const getVisibilityDescription = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return "Anyone with the link can view this document (no login required)";
      case 'space':
        return "All members of the space can access this document";
      default:
        return "Only you and explicitly shared users can access this document";
    }
  };

  const getUserName = (user: any) => {
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username;
  };

  const getUserInitials = (user: any) => {
    return user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user.username[0]?.toUpperCase() || "U";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Share Document</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visibility Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Document Visibility</Label>
            <Select value={newVisibility} onValueChange={setNewVisibility}>
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Private - Only you and shared users</span>
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Public - Anyone with the link</span>
                  </div>
                </SelectItem>
                <SelectItem value="space">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Space - All space members</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500">
              {getVisibilityDescription(newVisibility)}
            </p>
            {newVisibility !== document.visibility && (
              <Button size="sm" onClick={handleUpdateVisibility}>
                Update Visibility
              </Button>
            )}
          </div>

          <Separator />

          {/* Add People */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Share with people</Label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Enter email or username"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
                {/* User search results */}
                {userSearchResults && userSearchResults.length > 0 && userEmail && (
                  <div className="mt-2 bg-white border border-neutral-200 rounded-md shadow-sm max-h-32 overflow-y-auto">
                    {userSearchResults.map((user: any) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddUser(user.id)}
                        className="w-full flex items-center space-x-2 p-2 hover:bg-neutral-50 text-left"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{getUserName(user)}</div>
                          <div className="text-xs text-neutral-500">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Select value={userPermission} onValueChange={setUserPermission}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current Access */}
          {permissions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">People with access</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between p-2 bg-neutral-50 rounded-md"
                  >
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getUserInitials(permission.user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {getUserName(permission.user)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {permission.user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {permission.permission}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(permission.user.id)}
                        className="h-6 w-6 p-0 text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "wouter";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { DocumentHeader } from "@/components/document/document-header";
import { DocumentEditor } from "@/components/document/document-editor";
import { CommentsSection } from "@/components/document/comments-section";
import { ShareModal } from "@/components/modals/share-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Globe, Lock, Users, Edit3, Eye, Share2, History } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DocumentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [content, setContent] = useState("");

  const { data: document, isLoading: documentLoading } = useQuery({
    queryKey: ["/api/documents", id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch document");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/documents", id, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${id}/comments`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: permissions } = useQuery({
    queryKey: ["/api/documents", id, "permissions"],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${id}/permissions`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch permissions");
      return response.json();
    },
    enabled: !!id && user?.id === document?.authorId,
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async (data: { title?: string; content?: string }) => {
      const response = await apiRequest("PUT", `/api/documents/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id] });
      toast({
        title: "Document updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!document) return;
    
    await updateDocumentMutation.mutateAsync({
      content,
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    setContent(document?.content || "");
    setIsEditing(true);
  };

  const canEdit = user?.id === document?.authorId || permissions?.some(p => p.permission === 'edit');

  if (documentLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-80 p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-80 p-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-neutral-800 mb-2">Document not found</h1>
                <p className="text-neutral-600">The document you're looking for doesn't exist or you don't have access to it.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

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

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'bg-green-100 text-green-800';
      case 'space':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 ml-80 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-neutral-600 mb-6">
              <a href="/" className="hover:text-primary">Home</a>
              <span>/</span>
              {document.space && (
                <>
                  <a href={`/spaces/${document.space.slug}`} className="hover:text-primary">
                    {document.space.name}
                  </a>
                  <span>/</span>
                </>
              )}
              <span className="text-neutral-800">{document.title}</span>
            </nav>

            {/* Document Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h1 className="text-3xl font-bold text-neutral-800">
                    {document.title}
                  </h1>
                  <Badge 
                    variant="secondary" 
                    className={`${getVisibilityColor(document.visibility)} flex items-center space-x-1`}
                  >
                    {getVisibilityIcon(document.visibility)}
                    <span className="capitalize">{document.visibility}</span>
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <History className="mr-2 h-4 w-4" />
                    Version History
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShareModalOpen(true)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  {canEdit && (
                    <Button 
                      onClick={isEditing ? handleSave : handleEdit}
                      disabled={updateDocumentMutation.isPending}
                    >
                      {updateDocumentMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isEditing ? (
                        <Eye className="mr-2 h-4 w-4" />
                      ) : (
                        <Edit3 className="mr-2 h-4 w-4" />
                      )}
                      {isEditing ? "Save" : "Edit"}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-neutral-600">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {document.author.firstName?.[0] || document.author.username[0]}
                  </div>
                  <span>
                    Created by{' '}
                    <span className="font-medium">
                      {document.author.firstName && document.author.lastName
                        ? `${document.author.firstName} ${document.author.lastName}`
                        : document.author.username}
                    </span>
                  </span>
                </div>
                <span>•</span>
                <span>
                  Last updated{' '}
                  <span className="font-medium">
                    {new Date(document.updatedAt).toLocaleDateString()}
                  </span>
                </span>
                <span>•</span>
                <span>
                  <span className="font-medium">{document.views}</span> views
                </span>
              </div>
            </div>

            {/* Document Content */}
            <Card className="mb-8">
              <CardContent className="p-8">
                {isEditing ? (
                  <DocumentEditor
                    content={content}
                    onChange={setContent}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: document.content }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <CommentsSection 
              documentId={parseInt(id!)}
              comments={comments || []}
              loading={commentsLoading}
            />
          </div>
        </main>
      </div>

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        document={document}
        permissions={permissions || []}
      />
    </div>
  );
}

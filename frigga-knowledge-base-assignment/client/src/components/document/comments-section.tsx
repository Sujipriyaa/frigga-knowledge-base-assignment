import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send, AtSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  mentions: string[];
}

interface CommentsSectionProps {
  documentId: number;
  comments: Comment[];
  loading: boolean;
}

export function CommentsSection({ documentId, comments, loading }: CommentsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/comments`, {
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId.toString(), "comments"] });
      setNewComment("");
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    await createCommentMutation.mutateAsync(newComment);
  };

  const getAuthorName = (author: Comment['author']) => {
    return author.firstName && author.lastName
      ? `${author.firstName} ${author.lastName}`
      : author.username;
  };

  const getAuthorInitials = (author: Comment['author']) => {
    return author.firstName && author.lastName
      ? `${author.firstName[0]}${author.lastName[0]}`
      : author.username[0]?.toUpperCase() || "U";
  };

  const highlightMentions = (content: string) => {
    return content.replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Comments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>Comments ({comments.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Existing comments */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm font-medium">
                      {getAuthorInitials(comment.author)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-neutral-800">
                          {getAuthorName(comment.author)}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                          {new Date(comment.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div 
                        className="text-neutral-700"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightMentions(comment.content) 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}

          {/* New comment form */}
          {user && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="flex space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm font-medium">
                    {user.firstName && user.lastName
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : user.username[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment... Use @username to mention someone"
                    className="resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-1 text-xs text-neutral-500">
                      <AtSign className="h-3 w-3" />
                      <span>Type @ to mention someone</span>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!newComment.trim() || createCommentMutation.isPending}
                      className="px-4 py-2"
                    >
                      {createCommentMutation.isPending ? (
                        "Posting..."
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Comment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Share2, Edit3, Eye, History, Globe, Lock, Users } from "lucide-react";

interface DocumentHeaderProps {
  document: {
    id: number;
    title: string;
    visibility: string;
    views: number;
    createdAt: string;
    updatedAt: string;
    author: {
      id: number;
      username: string;
      firstName?: string;
      lastName?: string;
    };
    space?: {
      id: number;
      name: string;
      slug: string;
    };
  };
  isEditing: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onShare: () => void;
  onVersionHistory: () => void;
}

export function DocumentHeader({ 
  document, 
  isEditing, 
  canEdit, 
  onEdit, 
  onShare, 
  onVersionHistory 
}: DocumentHeaderProps) {
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

  const authorName = document.author.firstName && document.author.lastName
    ? `${document.author.firstName} ${document.author.lastName}`
    : document.author.username;

  const authorInitials = document.author.firstName && document.author.lastName
    ? `${document.author.firstName[0]}${document.author.lastName[0]}`
    : document.author.username[0]?.toUpperCase() || "U";

  return (
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
          <Button variant="outline" size="sm" onClick={onVersionHistory}>
            <History className="mr-2 h-4 w-4" />
            Version History
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          {canEdit && (
            <Button onClick={onEdit}>
              {isEditing ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </>
              ) : (
                <>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-neutral-600">
        <div className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs font-medium">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <span>
            Created by <span className="font-medium">{authorName}</span>
          </span>
        </div>
        <span>•</span>
        <span>
          Last updated <span className="font-medium">{new Date(document.updatedAt).toLocaleDateString()}</span>
        </span>
        <span>•</span>
        <span>
          <span className="font-medium">{document.views}</span> views
        </span>
      </div>
    </div>
  );
}

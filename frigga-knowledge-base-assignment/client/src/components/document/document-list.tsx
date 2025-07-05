import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Globe, Lock, Users, Eye, Calendar } from "lucide-react";

interface Document {
  id: number;
  title: string;
  content: string;
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
}

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  searchQuery?: string;
}

export function DocumentList({ documents, loading, searchQuery }: DocumentListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="h-64">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-2/3 mb-4" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-neutral-800 mb-2">
          {searchQuery ? "No documents found" : "No documents yet"}
        </h3>
        <p className="text-neutral-600 max-w-md mx-auto">
          {searchQuery
            ? `No documents match "${searchQuery}". Try adjusting your search terms.`
            : "Create your first document to get started with your knowledge base."
          }
        </p>
      </div>
    );
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-3 w-3" />;
      case 'space':
        return <Users className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
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

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getExcerpt = (content: string, maxLength: number = 150) => {
    // Strip HTML tags and get plain text
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((document) => (
        <Card 
          key={document.id} 
          className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer"
          onClick={() => window.location.href = `/documents/${document.id}`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-800 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {searchQuery ? highlightText(document.title, searchQuery) : document.title}
                </h3>
                {document.space && (
                  <div className="flex items-center space-x-1 text-xs text-neutral-500 mb-2">
                    <Users className="h-3 w-3" />
                    <span>{document.space.name}</span>
                  </div>
                )}
              </div>
              <Badge 
                variant="secondary" 
                className={`${getVisibilityColor(document.visibility)} flex items-center space-x-1 text-xs`}
              >
                {getVisibilityIcon(document.visibility)}
                <span className="capitalize">{document.visibility}</span>
              </Badge>
            </div>
            
            <p className="text-neutral-600 text-sm mb-4 line-clamp-3">
              {searchQuery 
                ? highlightText(getExcerpt(document.content), searchQuery)
                : getExcerpt(document.content)
              }
            </p>
            
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center space-x-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">
                    {document.author.firstName?.[0] || document.author.username[0]}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {document.author.firstName && document.author.lastName
                    ? `${document.author.firstName} ${document.author.lastName}`
                    : document.author.username}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{document.views}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(document.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

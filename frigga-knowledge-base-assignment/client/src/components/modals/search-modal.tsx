import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, Users, Globe, Lock, Calendar, Eye, Command } from "lucide-react";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SearchModal({ open, onOpenChange, searchQuery, onSearchChange }: SearchModalProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  // Search documents
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/documents/search", localQuery],
    queryFn: async () => {
      if (!localQuery || localQuery.length < 2) return [];
      const response = await fetch(`/api/documents/search?q=${encodeURIComponent(localQuery)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to search documents");
      return response.json();
    },
    enabled: !!localQuery && localQuery.length >= 2,
  });

  // Get recent documents when no search query
  const { data: recentDocuments } = useQuery({
    queryKey: ["/api/documents/recent"],
    queryFn: async () => {
      const response = await fetch("/api/documents/recent?limit=10", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch recent documents");
      return response.json();
    },
    enabled: !localQuery || localQuery.length < 2,
  });

  // Search users
  const { data: userResults } = useQuery({
    queryKey: ["/api/users/search", localQuery],
    queryFn: async () => {
      if (!localQuery || localQuery.length < 2) return [];
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(localQuery)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to search users");
      return response.json();
    },
    enabled: !!localQuery && localQuery.length >= 2,
  });

  const handleDocumentClick = (documentId: number) => {
    window.location.href = `/documents/${documentId}`;
    onOpenChange(false);
  };

  const handleInputChange = (value: string) => {
    setLocalQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-3 w-3 text-green-600" />;
      case 'space':
        return <Users className="h-3 w-3 text-blue-600" />;
      default:
        return <Lock className="h-3 w-3 text-gray-600" />;
    }
  };

  const getExcerpt = (content: string, maxLength: number = 100) => {
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
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

  const displayResults = localQuery && localQuery.length >= 2 ? searchResults : recentDocuments;
  const isSearching = localQuery && localQuery.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        {/* Search Input */}
        <div className="p-4 border-b border-neutral-200">
          <div className="relative">
            <Search className="absolute left-4 top-4 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search documents, spaces, people..."
              value={localQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-12 py-3 text-lg border-0 focus:ring-0 focus:outline-none"
              autoFocus
            />
            <div className="absolute right-4 top-4 flex items-center space-x-1 text-xs text-neutral-400">
              <Command className="h-3 w-3" />
              <span>ESC</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {searchLoading ? (
            <div className="p-4">
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Document Results */}
              {displayResults && displayResults.length > 0 && (
                <div className="p-4">
                  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                    {isSearching ? `Documents (${displayResults.length})` : "Recent Documents"}
                  </div>
                  <div className="space-y-2">
                    {displayResults.map((doc: any) => (
                      <button
                        key={doc.id}
                        onClick={() => handleDocumentClick(doc.id)}
                        className="w-full flex items-start space-x-3 p-3 hover:bg-neutral-50 rounded-md text-left transition-colors"
                      >
                        <FileText className="h-5 w-5 text-neutral-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="font-medium text-neutral-800 truncate">
                              {isSearching 
                                ? highlightText(doc.title, localQuery)
                                : doc.title
                              }
                            </div>
                            {getVisibilityIcon(doc.visibility)}
                          </div>
                          <div className="text-sm text-neutral-600 line-clamp-2 mb-1">
                            {isSearching 
                              ? highlightText(getExcerpt(doc.content), localQuery)
                              : getExcerpt(doc.content)
                            }
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-neutral-500">
                            {doc.space && (
                              <span className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{doc.space.name}</span>
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{doc.views}</span>
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User Results */}
              {userResults && userResults.length > 0 && isSearching && (
                <div className="p-4 border-t border-neutral-100">
                  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                    People ({userResults.length})
                  </div>
                  <div className="space-y-2">
                    {userResults.slice(0, 5).map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 hover:bg-neutral-50 rounded-md"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-sm">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-neutral-800">
                            {highlightText(getUserName(user), localQuery)}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {highlightText(user.email, localQuery)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {isSearching && (!displayResults || displayResults.length === 0) && (!userResults || userResults.length === 0) && !searchLoading && (
                <div className="p-8 text-center">
                  <Search className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">No results found</h3>
                  <p className="text-neutral-600">
                    No documents or people match "{localQuery}". Try adjusting your search terms.
                  </p>
                </div>
              )}

              {/* Empty State for Recent */}
              {!isSearching && (!displayResults || displayResults.length === 0) && (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">No recent documents</h3>
                  <p className="text-neutral-600">
                    Start creating documents to see them here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-xs">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-xs">↵</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-xs">ESC</kbd>
                <span>Close</span>
              </div>
            </div>
            <div>
              {isSearching && displayResults && (
                <span>{displayResults.length} document{displayResults.length !== 1 ? 's' : ''} found</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

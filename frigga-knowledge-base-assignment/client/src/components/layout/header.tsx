import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchModal } from "@/components/modals/search-modal";
import { BookOpen, Search, Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  onSearchChange?: (query: string) => void;
}

export function Header({ onSearchChange }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.username?.[0]?.toUpperCase() || "U";

  return (
    <>
      <header className="bg-white border-b border-neutral-100 h-16 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-neutral-800">KnowledgeBase Pro</span>
            </div>
            <div className="hidden md:flex items-center space-x-4 ml-8">
              <a href="/" className="text-neutral-700 hover:text-primary font-medium">
                Dashboard
              </a>
              <a href="/spaces" className="text-neutral-700 hover:text-primary font-medium">
                Spaces
              </a>
              <a href="/people" className="text-neutral-700 hover:text-primary font-medium">
                People
              </a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Global search */}
            <div className="relative hidden md:block">
              <Input
                type="text"
                placeholder="Search documents, spaces, people..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-80 pl-10 bg-neutral-50 border-neutral-200 focus:ring-2 focus:ring-primary focus:border-transparent"
                onFocus={() => setSearchModalOpen(true)}
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-neutral-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </div>
            
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />
    </>
  );
}

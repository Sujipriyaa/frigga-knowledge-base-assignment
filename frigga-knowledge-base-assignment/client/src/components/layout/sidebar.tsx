import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Home, Users, Code, TrendingUp, FileText, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertSpaceSchema, type InsertSpace } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  selectedSpace?: number;
  onSpaceChange?: (spaceId: number | undefined) => void;
}

export function Sidebar({ selectedSpace, onSpaceChange }: SidebarProps) {
  const { toast } = useToast();
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);

  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ["/api/spaces"],
    queryFn: async () => {
      const response = await fetch("/api/spaces", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch spaces");
      return response.json();
    },
  });

  const { data: recentDocuments } = useQuery({
    queryKey: ["/api/documents/recent"],
    queryFn: async () => {
      const response = await fetch("/api/documents/recent?limit=5", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch recent documents");
      return response.json();
    },
  });

  const form = useForm<InsertSpace>({
    resolver: zodResolver(insertSpaceSchema),
    defaultValues: {
      name: "",
      description: "",
      slug: "",
      isPrivate: false,
    },
  });

  const onCreateSpace = async (data: InsertSpace) => {
    try {
      // Generate slug from name
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      await apiRequest("POST", "/api/spaces", { ...data, slug });
      queryClient.invalidateQueries({ queryKey: ["/api/spaces"] });
      setCreateSpaceOpen(false);
      form.reset();
      toast({
        title: "Space created",
        description: "Your new space has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create space. Please try again.",
        variant: "destructive",
      });
    }
  };

  const defaultSpaces = [
    { id: 'home', name: 'Home', icon: Home },
    { id: 'team', name: 'Team Wiki', icon: Users },
    { id: 'engineering', name: 'Engineering', icon: Code },
    { id: 'product', name: 'Product', icon: TrendingUp },
  ];

  return (
    <aside className="w-80 bg-white border-r border-neutral-100 fixed left-0 top-16 bottom-0 overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <Button 
            className="w-full bg-primary hover:bg-blue-600 text-white"
            onClick={() => {
              // Navigate to create document - this would be handled by router
              window.location.href = "/#create-document";
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Document
          </Button>
        </div>
        
        <nav className="space-y-2">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Spaces
          </div>
          
          {/* Default navigation items */}
          {defaultSpaces.map((item) => (
            <button
              key={item.id}
              onClick={() => onSpaceChange?.(item.id === 'home' ? undefined : parseInt(item.id))}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                (item.id === 'home' && !selectedSpace) || selectedSpace?.toString() === item.id
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <item.icon className="h-4 w-4 text-neutral-400" />
              <span>{item.name}</span>
            </button>
          ))}
          
          {/* User spaces */}
          {spaces?.map((space: any) => (
            <button
              key={space.id}
              onClick={() => onSpaceChange?.(space.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                selectedSpace === space.id
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Building className="h-4 w-4 text-neutral-400" />
              <span>{space.name}</span>
            </button>
          ))}
          
          {/* Create space button */}
          <Dialog open={createSpaceOpen} onOpenChange={setCreateSpaceOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-neutral-600 hover:text-primary hover:bg-neutral-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Space
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Space</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateSpace)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Space Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter space name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of this space"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setCreateSpaceOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Space</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* Recent documents */}
          {recentDocuments && recentDocuments.length > 0 && (
            <>
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 mt-6">
                Recent
              </div>
              <div className="space-y-1">
                {recentDocuments.map((doc: any) => (
                  <a
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-neutral-400" />
                    <span className="text-sm truncate">{doc.title}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </nav>
      </div>
    </aside>
  );
}

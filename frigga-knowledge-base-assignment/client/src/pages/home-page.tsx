import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { DocumentList } from "@/components/document/document-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertDocumentSchema, type InsertDocument } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const createDocumentSchema = insertDocumentSchema.pick({
  title: true,
  content: true,
  visibility: true,
  spaceId: true,
});

type CreateDocumentData = {
  title: string;
  content: string;
  visibility: string;
  spaceId?: number;
};

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpace, setSelectedSpace] = useState<number | undefined>();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents", selectedSpace],
    queryFn: async () => {
      const url = selectedSpace ? `/api/documents?spaceId=${selectedSpace}` : "/api/documents";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
  });

  const { data: spaces } = useQuery({
    queryKey: ["/api/spaces"],
    queryFn: async () => {
      const response = await fetch("/api/spaces", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch spaces");
      return response.json();
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["/api/documents/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const response = await fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to search documents");
      return response.json();
    },
    enabled: !!searchQuery,
  });

  const form = useForm<CreateDocumentData>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      title: "",
      content: "",
      visibility: "private",
      spaceId: undefined,
    },
  });

  const onCreateDocument = async (data: CreateDocumentData) => {
    try {
      await apiRequest("POST", "/api/documents", data);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Document created",
        description: "Your document has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const displayedDocuments = searchQuery ? searchResults : documents;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header onSearchChange={setSearchQuery} />
      
      <div className="flex pt-16">
        <Sidebar selectedSpace={selectedSpace} onSpaceChange={setSelectedSpace} />
        
        <main className="flex-1 ml-80 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-800">
                    {searchQuery ? "Search Results" : selectedSpace ? "Space Documents" : "All Documents"}
                  </h1>
                  <p className="text-neutral-600 mt-2">
                    {searchQuery 
                      ? `Results for "${searchQuery}"`
                      : "Browse and manage your documents"
                    }
                  </p>
                </div>
                
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-blue-600">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create New Document</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onCreateDocument)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Document title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Start writing your document..."
                                  rows={8}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="visibility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Visibility</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select visibility" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="private">Private</SelectItem>
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="space">Space</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="spaceId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Space (Optional)</FormLabel>
                                <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select space" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {spaces?.map((space: any) => (
                                      <SelectItem key={space.id} value={space.id.toString()}>
                                        {space.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Create Document</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Documents List */}
            <DocumentList 
              documents={displayedDocuments || []} 
              loading={documentsLoading}
              searchQuery={searchQuery}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

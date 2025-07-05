import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bold, Italic, Underline, List, ListOrdered, Quote, Link2, Image, Table, Save, X } from "lucide-react";

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function DocumentEditor({ content, onChange, onSave, onCancel }: DocumentEditorProps) {
  const [editorContent, setEditorContent] = useState(content);

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const handleContentChange = (value: string) => {
    setEditorContent(value);
    onChange(value);
  };

  const insertText = (before: string, after: string = "") => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editorContent.substring(start, end);
    
    const newText = editorContent.substring(0, start) + 
                   before + selectedText + after + 
                   editorContent.substring(end);
    
    handleContentChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertText("**", "**"), tooltip: "Bold" },
    { icon: Italic, action: () => insertText("*", "*"), tooltip: "Italic" },
    { icon: Underline, action: () => insertText("_", "_"), tooltip: "Underline" },
    { separator: true },
    { icon: List, action: () => insertText("- "), tooltip: "Bullet List" },
    { icon: ListOrdered, action: () => insertText("1. "), tooltip: "Numbered List" },
    { icon: Quote, action: () => insertText("> "), tooltip: "Quote" },
    { separator: true },
    { icon: Link2, action: () => insertText("[", "](url)"), tooltip: "Link" },
    { icon: Image, action: () => insertText("![alt](", ")"), tooltip: "Image" },
    { icon: Table, action: () => insertText("| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n"), tooltip: "Table" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 flex-wrap">
            {toolbarButtons.map((button, index) => (
              button.separator ? (
                <Separator key={index} orientation="vertical" className="h-6" />
              ) : (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={button.action}
                  className="p-2 h-8 w-8"
                  title={button.tooltip}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              )
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editor pane */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-neutral-700">Editor</h3>
          <Textarea
            value={editorContent}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[400px] font-mono text-sm resize-none"
            placeholder="Start writing your document... Use **bold**, *italic*, and other markdown syntax."
          />
        </div>

        {/* Preview pane */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-neutral-700">Preview</h3>
          <Card className="min-h-[400px]">
            <CardContent className="p-4">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: editorContent
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/_(.*?)_/g, '<u>$1</u>')
                    .replace(/^- (.*)$/gm, '<li>$1</li>')
                    .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
                    .replace(/\n/g, '<br>')
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

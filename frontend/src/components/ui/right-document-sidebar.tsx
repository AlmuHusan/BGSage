import { FileText, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Document } from '../types';

interface RightSidebarProps {
  documents: Document[];
  isExpanded: boolean;
  isVisible: boolean;
  onToggleDoc: (docId: number) => void;
  onExpand: () => void;
  onCollapse: () => void;
  onDelete: (doc: Document) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function RightSidebar({
  documents,
  isExpanded,
  isVisible,
  onToggleDoc,
  onExpand,
  onCollapse,
  onDelete,
  onUpload,
}: RightSidebarProps) {
  return (
    <div
      className={`bg-card border-l transition-all duration-300 ease-in-out flex flex-col z-50 overflow-hidden ${
        isVisible ? 'fixed right-0 top-0 bottom-0 w-72' : 'hidden'
      } md:flex md:relative ${isExpanded ? 'md:w-72' : 'md:w-12'}`}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b flex items-center justify-between">
        {isExpanded ? (
          <>
            <Button onClick={onCollapse} size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" title="Collapse Sidebar">
              <ChevronRight size={16} />
            </Button>
            <h2 className="text-lg font-bold flex-1 text-center">Documents</h2>
          </>
        ) : (
          <Button onClick={onExpand} size="icon" variant="ghost" className="mx-auto h-8 w-8" title="Expand Sidebar">
            <ChevronLeft size={16} />
          </Button>
        )}
      </div>

      {/* Document List */}
      {isExpanded && (
        <>
          <ScrollArea className="flex-1">
            <div className="px-3 py-3 space-y-2">
              {documents.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No documents uploaded</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center  px-2 py-2 rounded-lg bg-accent/80 hover:bg-primary/10 transition-colors"
                  >
                    <Checkbox
                      id={`doc-${doc.id}`}
                      checked={doc.selected}
                      onCheckedChange={() => onToggleDoc(doc.id)}
                      className="flex-shrink-0"
                    />
                    <FileText size={18} className="flex-shrink-0 text-primary" />
                    <span className="flex-1 min-w-0 text-xs font-medium truncate">{doc.name}</span>
                    <Button
                      onClick={() => onDelete(doc)}
                      size="icon"
                      variant="ghost"
                      className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                      title="Delete document"
                    >
                      <X size={13} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="px-3 py-3 border-t">
            <input
              type="file"
              id="sidebar-file-upload"
              className="hidden"
              onChange={onUpload}
            />
            <Button
              onClick={() => document.getElementById('sidebar-file-upload')?.click()}
              className="w-full"
              variant="default"
            >
              <Upload size={16} className="mr-2" />
              Upload Document
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

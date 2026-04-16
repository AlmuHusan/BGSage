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
  const allChecked = documents.length > 0 && documents.every((doc) => doc.selected);
  const someChecked = documents.some((doc) => doc.selected) && !allChecked;


  return (
    <div
      className={`bg-card border-l transition-all duration-300 ease-in-out flex flex-col z-50 ${
        isVisible ? 'fixed right-0 top-0 bottom-0 w-80' : 'hidden'
      } md:flex md:relative ${isExpanded ? 'md:w-80' : 'md:w-12'}`}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {isExpanded ? (
          <>
            <Button onClick={onCollapse} size="icon" variant="ghost" title="Collapse Sidebar">
              <ChevronRight size={18} />
            </Button>
            <h2 className="text-xl font-bold flex-1 text-center">Documents</h2>
          </>
        ) : (
          <Button onClick={onExpand} size="icon" variant="ghost" className="mx-auto" title="Expand Sidebar">
            <ChevronLeft size={18} />
          </Button>
        )}
      </div>

      {/* Document List */}
      {isExpanded && (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {documents.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No documents uploaded</p>
                </div>
              ) : (
                <>


                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-lg transition-colors bg-accent/80 hover:bg-primary/10"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`doc-${doc.id}`}
                          checked={doc.selected}
                          onCheckedChange={() => onToggleDoc(doc.id)}
                          className="flex-shrink-0"
                        />
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                          <FileText size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                        </div>
                        <Button
                          onClick={() => onDelete(doc)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 flex-shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                          title="Delete document"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
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
              <Upload size={18} className="mr-2" />
              Upload Document
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
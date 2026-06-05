import { Plus, Menu, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Session } from '../types';

interface LeftSidebarProps {
  sessions: Session[];
  activeSession: number | null;
  isExpanded: boolean;
  isVisible: boolean;
  onSelectSession: (id: number) => void;
  onNewSession: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onDeleteSession: (session: Session) => void;
}

export default function LeftSidebar({
  sessions,
  activeSession,
  isExpanded,
  isVisible,
  onSelectSession,
  onNewSession,
  onExpand,
  onCollapse,
  onDeleteSession,
}: LeftSidebarProps) {
  return (
    <div
      className={`bg-card border-r transition-all duration-300 ease-in-out flex flex-col z-50 overflow-hidden ${
        isVisible ? 'fixed left-0 top-0 bottom-0 w-72' : 'hidden'
      } md:flex md:relative ${isExpanded ? 'md:w-72' : 'md:w-16'}`}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b flex items-center justify-between">
        {isExpanded ? (
          <>
            <h1 className="text-lg font-bold">Messages</h1>
            <div className="flex gap-1">
              <Button onClick={onNewSession} size="icon" variant="default" className="h-8 w-8" title="New session">
                <Plus size={16} />
              </Button>
              <Button onClick={onCollapse} size="icon" variant="ghost" className="h-8 w-8" title="Collapse Sidebar">
                <ChevronLeft size={16} />
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={onExpand} size="icon" variant="ghost" className="mx-auto h-8 w-8" title="Expand Sidebar">
            <Menu size={16} />
          </Button>
        )}
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`cursor-pointer border-b hover:bg-accent transition-colors ${
              activeSession === session.id ? 'bg-accent border-l-4 border-l-primary' : ''
            }`}
          >
            {isExpanded ? (
              <div className="flex items-center px-3 py-3 min-w-0">
                {/* Text block */}
                <div className="flex-1">
                  <div className="flex-1 items-center  mb-0.5">
                    <h3 className=" flex-1 font-semibold text-sm truncate">{session.name}</h3>
                  </div>
                  <div className="">
                    <p className="flex  w-50 text-xs text-muted-foreground truncate">{session.last_message}</p>
                  </div>
                  
                </div>
                <Button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session); }}
                  size="icon"
                  variant="ghost"
                  className="flex h-7 w-7 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  title="Delete session"
                >
                  <X size={13} />
                </Button>
                {/* Delete button — always visible, outside text block */}
                
              </div>
            ) : (
              <div className="flex justify-center items-center py-4 relative">
                {session.unread > 0 && (
                  <Badge className="absolute top-2 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {session.unread}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

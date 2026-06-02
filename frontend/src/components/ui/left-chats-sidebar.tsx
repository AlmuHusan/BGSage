import { Plus, Menu, X } from 'lucide-react';
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
}: LeftSidebarProps) {
  return (
    <div
      className={`bg-card border-r transition-all duration-300 ease-in-out flex flex-col z-50 ${
        isVisible ? 'fixed left-0 top-0 bottom-0 w-80' : 'hidden'
      } md:flex md:relative ${isExpanded ? 'md:w-80' : 'md:w-16'}`}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {isExpanded ? (
          <>
            <h1 className="text-xl font-bold">Messages</h1>
            <div className="flex gap-2">
              <Button onClick={onNewSession} size="icon" variant="default" title="New session">
                <Plus size={18} />
              </Button>
              <Button onClick={onCollapse} size="icon" variant="ghost" title="Collapse Sidebar">
                <X size={18} />
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={onExpand} size="icon" variant="ghost" className="mx-auto" title="Expand Sidebar">
            <Menu size={18} />
          </Button>
        )}
      </div>

      {/* session List */}
      <ScrollArea className="flex-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`p-4 cursor-pointer border-b hover:bg-accent transition-colors ${
              activeSession === session.id ? 'bg-accent border-l-4 border-l-primary' : ''
            }`}
          >
            {isExpanded ? (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold truncate">{session.name}</h3>
                    <span className="text-xs text-muted-foreground">{session.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">{session.last_message}</p>
                    {session.unread > 0 && <Badge className="ml-2">{session.unread}</Badge>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center relative">
                {session.unread > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
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
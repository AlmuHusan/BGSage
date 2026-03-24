import { Menu, FileText, Edit2, Check, X, MessageSquare, Send, Mic, Square, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Chat, Message } from '../types';

interface ChatAreaProps {
  currentChat: Chat | undefined;
  input: string;
  isRecording: boolean;
  recordingDuration: number;
  isEditingName: boolean;
  editedName: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartEditingName: () => void;
  onSaveChatName: () => void;
  onCancelEditingName: () => void;
  onEditedNameChange: (value: string) => void;
  onShowLeftSidebar: () => void;
  onShowRightSidebar: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ChatArea({
  currentChat,
  input,
  isRecording,
  recordingDuration,
  isEditingName,
  editedName,
  onInputChange,
  onSend,
  onKeyPress,
  onStartRecording,
  onStopRecording,
  onFileUpload,
  onStartEditingName,
  onSaveChatName,
  onCancelEditingName,
  onEditedNameChange,
  onShowLeftSidebar,
  onShowRightSidebar,
}: ChatAreaProps) {
  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
        <p>Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={onShowLeftSidebar}
            size="icon"
            variant="ghost"
            className="md:hidden"
            title="Show chats"
          >
            <Menu size={18} />
          </Button>

          <div className="flex-1 flex items-center gap-2">
            {isEditingName ? (
              <>
                <Input
                  type="text"
                  value={editedName}
                  onChange={(e) => onEditedNameChange(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && onSaveChatName()}
                  className="h-9 max-w-xs"
                  autoFocus
                />
                <Button onClick={onSaveChatName} size="icon" variant="ghost" className="h-9 w-9" title="Save name">
                  <Check size={18} />
                </Button>
                <Button onClick={onCancelEditingName} size="icon" variant="ghost" className="h-9 w-9" title="Cancel">
                  <X size={18} />
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{currentChat.name}</h2>
                </div>
                <Button onClick={onStartEditingName} size="icon" variant="ghost" title="Edit chat name">
                  <Edit2 size={18} />
                </Button>
              </>
            )}
          </div>

          <Button
            onClick={onShowRightSidebar}
            size="icon"
            variant="ghost"
            className="md:hidden"
            title="Show documents"
          >
            <FileText size={18} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {currentChat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentChat.messages.map((message: Message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  }`}
                >
                  <p className="break-words">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'opacity-70' : 'text-muted-foreground'}`}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-card border-t p-4">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 dark:text-red-400 font-medium">
                Recording... {formatDuration(recordingDuration)}
              </span>
            </div>
            <Button onClick={onStopRecording} size="icon" variant="destructive">
              <Square size={18} />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyUp={onKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <input type="file" id="file-upload" className="hidden" onChange={onFileUpload} />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              size="icon"
              variant="outline"
              title="Upload document"
            >
              <Upload size={18} />
            </Button>
            <Button onClick={onStartRecording} size="icon" variant="outline" title="Record voice message">
              <Mic size={18} />
            </Button>
            <Button onClick={onSend} size="icon">
              <Send size={18} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
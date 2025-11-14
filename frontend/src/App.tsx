import { useState, useEffect } from 'react';
import { Send, Plus, MessageSquare, Menu, X, Mic, Square, Upload, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'other';
  time: string;
  isVoice?: boolean;
  isFile?: boolean;
}

interface Chat {
  id: number;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  messages: Message[];
}

interface Document {
  id: number;
  name: string;
  size: string;
  uploadedAt: string;
}

export default function ChatApp() {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 1,
      name: "Alex Johnson",
      initials: "AJ",
      lastMessage: "Pretty good! Working on some projects.",
      time: "10:32 AM",
      unread: 0,
      messages: [
        { id: 1, text: "Hey! How are you?", sender: "other", time: "10:30 AM" },
        { id: 2, text: "I'm doing great, thanks! How about you?", sender: "user", time: "10:31 AM" },
        { id: 3, text: "Pretty good! Working on some projects.", sender: "other", time: "10:32 AM" },
      ]
    }
  ]);

  const [activeChat, setActiveChat] = useState<number>(1);
  const [input, setInput] = useState<string>("");

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState<boolean>(true);
  const [rightSidebarExpanded, setRightSidebarExpanded] = useState<boolean>(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(false);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(false);
  const [documents, setDocuments] = useState<Document[]>([
    { id: 1, name: "Project_Proposal.pdf", size: "2.4 MB", uploadedAt: "Today, 9:30 AM" },
    { id: 2, name: "Meeting_Notes.docx", size: "156 KB", uploadedAt: "Yesterday" },
    { id: 3, name: "Budget_2024.xlsx", size: "890 KB", uploadedAt: "Oct 15" },
  ]);

  const currentChat = chats.find(chat => chat.id === activeChat);

  useEffect(() => {
    const handleResize = (): void => {
      if (window.innerWidth >= 768) {
        setLeftSidebarExpanded(true);
        setRightSidebarExpanded(true);
        setShowLeftSidebar(false);
        setShowRightSidebar(false);
      } else {
        // On mobile, keep sidebars collapsed by default
        setLeftSidebarExpanded(true); // Keep expanded when shown
        setRightSidebarExpanded(true); // Keep expanded when shown
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSend = (): void => {
    if (input.trim() && currentChat) {
      const newMessage: Message = {
        id: currentChat.messages.length + 1,
        text: input,
        sender: "user",
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      
      setChats(chats.map(chat => 
        chat.id === activeChat 
          ? { 
              ...chat, 
              messages: [...chat.messages, newMessage],
              lastMessage: input,
              time: "Just now"
            }
          : chat
      ));
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const createNewChat = (): void => {
    const newChatId = Math.max(...chats.map(c => c.id)) + 1;
    const newChat: Chat = {
      id: newChatId,
      name: `New Chat ${newChatId}`,
      initials: "NC",
      lastMessage: "Start a conversation...",
      time: "Now",
      unread: 0,
      messages: []
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChatId);
  };

  const startRecording = (): void => {
    setIsRecording(true);
    setRecordingDuration(0);
    
    const interval = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
    
    (window as any).recordingInterval = interval;
  };

  const stopRecording = (): void => {
    if (!currentChat) return;
    
    setIsRecording(false);
    clearInterval((window as any).recordingInterval);
    
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = recordingDuration % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const voiceMessage: Message = {
      id: currentChat.messages.length + 1,
      text: `🎤 Voice message (${duration})`,
      sender: "user",
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isVoice: true
    };
    
    setChats(chats.map(chat => 
      chat.id === activeChat 
        ? { 
            ...chat, 
            messages: [...chat.messages, voiceMessage],
            lastMessage: `🎤 Voice message`,
            time: "Just now"
          }
        : chat
    ));
    
    setRecordingDuration(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file && currentChat) {
      const newDoc: Document = {
        id: documents.length + 1,
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        uploadedAt: "Just now"
      };
      setDocuments([newDoc, ...documents]);
      
      const fileMessage: Message = {
        id: currentChat.messages.length + 1,
        text: `📎 Uploaded ${file.name}`,
        sender: "user",
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isFile: true
      };
      
      setChats(chats.map(chat => 
        chat.id === activeChat 
          ? { 
              ...chat, 
              messages: [...chat.messages, fileMessage],
              lastMessage: `📎 ${file.name}`,
              time: "Just now"
            }
          : chat
      ));
    }
  };

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Overlay for Left Sidebar */}
      {showLeftSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowLeftSidebar(false)}
        />
      )}

      {/* Mobile Overlay for Right Sidebar */}
      {showRightSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowRightSidebar(false)}
        />
      )}

      {/* Left Sidebar */}
      <div 
        className={`bg-card border-r transition-all duration-300 ease-in-out flex flex-col z-50 ${
          showLeftSidebar ? 'fixed left-0 top-0 bottom-0 w-80' : 'hidden'
        } md:flex md:relative ${
          leftSidebarExpanded ? 'md:w-80' : 'md:w-16'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {leftSidebarExpanded ? (
            <>
              <h1 className="text-xl font-bold">Messages</h1>
              <div className="flex gap-2">
                <Button
                  onClick={createNewChat}
                  size="icon"
                  variant="default"
                  title="New Chat"
                >
                  <Plus size={18} />
                </Button>
                <Button
                  onClick={() => {
                    setLeftSidebarExpanded(false);
                    if (window.innerWidth < 768) {
                      setShowLeftSidebar(false);
                    }
                  }}
                  size="icon"
                  variant="ghost"
                  title="Collapse Sidebar"
                >
                  <X size={18} />
                </Button>
              </div>
            </>
          ) : (
            <Button
              onClick={() => setLeftSidebarExpanded(true)}
              size="icon"
              variant="ghost"
              className="mx-auto"
              title="Expand Sidebar"
            >
              <Menu size={18} />
            </Button>
          )}
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setActiveChat(chat.id);
                setShowLeftSidebar(false);
              }}
              className={`p-4 cursor-pointer border-b hover:bg-accent transition-colors ${
                activeChat === chat.id ? 'bg-accent border-l-4 border-l-primary' : ''
              }`}
            >
              {leftSidebarExpanded ? (
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>{chat.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">{chat.name}</h3>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <Badge className="ml-2">{chat.unread}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center relative">
                  <Avatar>
                    <AvatarFallback>{chat.initials}</AvatarFallback>
                  </Avatar>
                  {chat.unread > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {chat.unread}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-card border-b p-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowLeftSidebar(true)}
                  size="icon"
                  variant="ghost"
                  className="md:hidden"
                  title="Show chats"
                >
                  <Menu size={18} />
                </Button>
                <Avatar>
                  <AvatarFallback>{currentChat.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{currentChat.name}</h2>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
                <Button
                  onClick={() => setShowRightSidebar(true)}
                  size="icon"
                  variant="ghost"
                  className="md:hidden"
                  title="Show documents"
                >
                  <FileText size={18} />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
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
                  {currentChat.messages.map((message) => (
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
                        <p
                          className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'opacity-70' : 'text-muted-foreground'
                          }`}
                        >
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
                      Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <Button onClick={stopRecording} size="icon" variant="destructive">
                    <Square size={18} />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button 
                    onClick={() => document.getElementById('file-upload')?.click()} 
                    size="icon"
                    variant="outline"
                    title="Upload document"
                  >
                    <Upload size={18} />
                  </Button>
                  <Button 
                    onClick={startRecording} 
                    size="icon"
                    variant="outline"
                    title="Record voice message"
                  >
                    <Mic size={18} />
                  </Button>
                  <Button onClick={handleSend} size="icon">
                    <Send size={18} />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Documents */}
      <div 
        className={`bg-card border-l transition-all duration-300 ease-in-out flex flex-col z-50 ${
          showRightSidebar ? 'fixed right-0 top-0 bottom-0 w-80' : 'hidden'
        } md:flex md:relative ${
          rightSidebarExpanded ? 'md:w-80' : 'md:w-12'
        }`}
      >
        {/* Right Sidebar Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {rightSidebarExpanded ? (
            <>
              <h2 className="text-lg font-semibold">Documents</h2>
              <Button
                onClick={() => {
                  setRightSidebarExpanded(false);
                  if (window.innerWidth < 768) {
                    setShowRightSidebar(false);
                  }
                }}
                size="icon"
                variant="ghost"
                title="Collapse Sidebar"
              >
                <ChevronRight size={18} />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setRightSidebarExpanded(true)}
              size="icon"
              variant="ghost"
              className="mx-auto"
              title="Expand Sidebar"
            >
              <ChevronLeft size={18} />
            </Button>
          )}
        </div>

        {/* Documents List */}
        {rightSidebarExpanded && (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {documents.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No documents uploaded</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                        <FileText size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                        <p className="text-xs text-muted-foreground">{doc.size}</p>
                        <p className="text-xs text-muted-foreground mt-1">{doc.uploadedAt}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Download"
                      >
                        <Download size={16} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
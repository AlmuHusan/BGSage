import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { Chat, Message, Document } from './components/types';
import LeftSidebar from './components/ui/left-chats-sidebar';
import RightSidebar from './components/ui/right-document-sidebar';
import ChatArea from './components/ui/ChatArea';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'https://bgsageapi.onrender.com';

const API_HEADERS = {
  'Content-Type': 'application/json; charset=UTF-8',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function extractPdfPages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    pages.push(textContent.items.map((item: any) => item.str).join(' '));
  }
  return pages;
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function apiFetchBooks(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/books`, {
    method: 'POST',
    headers: API_HEADERS
  });
  return res.json();
}

async function apiAskBGSage(query: string): Promise<string> {
  const res = await fetch(`${API_BASE}/askBGSage`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({ query }),
  });
  return res.json();
}

async function apiInsertRows(documentName: string, pages: string[]): Promise<void> {
  await fetch(`${API_BASE}/insertRows`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({ document: documentName, pages }),
  });
}

async function apiVectorSearch(queryString: string): Promise<void> {
  await fetch(`${API_BASE}/vectorSearch`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({ queryString: queryString }),
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatApp() {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 1,
      name: 'Session 1',
      lastMessage: '',
      time: '10:32 AM',
      unread: 0,
      messages: [],
    },
  ]);

  const [activeChat, setActiveChat] = useState(1);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightSidebarExpanded, setRightSidebarExpanded] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentChat = chats.find((chat) => chat.id === activeChat);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        setLeftSidebarExpanded(true);
        setRightSidebarExpanded(true);
        setShowLeftSidebar(false);
        setShowRightSidebar(false);
      }
    };

    retrieveDocuments();
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Chat state helpers ───────────────────────────────────────────────────

  function updateChat(chatId: number, updates: Partial<Chat>): void {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, ...updates } : chat))
    );
  }

  function addMessageToChat(chatId: number, message: Message, lastMessage: string): void {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, message], lastMessage, time: 'Just now' }
          : chat
      )
    );
  }

  // ── Documents ────────────────────────────────────────────────────────────

  async function retrieveDocuments(): Promise<void> {
    try {
      const bookData = await apiFetchBooks();
      console.log(bookDaara)
      setDocuments(bookData.map((name, index) => ({ id: index + 1, name })));
    } catch (err) {
      console.error('Failed to retrieve documents:', err);
    }
  }

  function deleteDocument(docId: number): void {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  }

  // ── Messaging ────────────────────────────────────────────────────────────

  async function handleSend(): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed || !currentChat) return;

    const userMessage: Message = {
      id: currentChat.messages.length + 1,
      text: trimmed,
      sender: 'user',
      time: currentTime(),
    };

    addMessageToChat(activeChat, userMessage, trimmed);
    setInput('');

    try {
      const resVectorSearch = await apiVectorSearch(trimmed);
      console.log(resVectorSearch)
      const resAskBGSage = await apiAskBGSage(trimmed);
      const systemMessage: Message = {
        id: currentChat.messages.length + 2,
        text: resAskBGSage,
        sender: 'system',
        time: currentTime(),
      };
      addMessageToChat(activeChat, systemMessage, resAskBGSage);
    } catch (err) {
      console.error('Failed to get response:', err);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Chat management ──────────────────────────────────────────────────────

  function createNewChat(): void {
    const newId = Math.max(...chats.map((c) => c.id)) + 1;
    const newChat: Chat = {
      id: newId,
      name: `New Chat ${newId}`,
      lastMessage: 'Start a conversation...',
      time: 'Now',
      unread: 0,
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChat(newId);
  }

  function startEditingName(): void {
    if (currentChat) {
      setEditedName(currentChat.name);
      setIsEditingName(true);
    }
  }

  function saveChatName(): void {
    if (editedName.trim() && currentChat) {
      updateChat(activeChat, { name: editedName.trim() });
      setIsEditingName(false);
    }
  }

  // ── Recording ────────────────────────────────────────────────────────────

  function startRecording(): void {
    setIsRecording(true);
    setRecordingDuration(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }

  function stopRecording(): void {
    if (!currentChat) return;

    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    const voiceMessage: Message = {
      id: currentChat.messages.length + 1,
      text: `🎤 Voice message (${formatDuration(recordingDuration)})`,
      sender: 'user',
      time: currentTime(),
      isVoice: true,
    };

    addMessageToChat(activeChat, voiceMessage, '🎤 Voice message');
    setRecordingDuration(0);
  }

  // ── File upload ──────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file || !currentChat) return;

    try {
      const pages = await extractPdfPages(file);
      await apiInsertRows(file.name, pages);

      setDocuments((prev) => [{ id: prev.length + 1, name: file.name }, ...prev]);

      const fileMessage: Message = {
        id: currentChat.messages.length + 1,
        text: `📎 Uploaded ${file.name}`,
        sender: 'user',
        time: currentTime(),
        isFile: true,
      };

      addMessageToChat(activeChat, fileMessage, `📎 ${file.name}`);
    } catch (err) {
      console.error('File upload failed:', err);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile overlays */}
      {showLeftSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowLeftSidebar(false)} />
      )}
      {showRightSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowRightSidebar(false)} />
      )}

      <LeftSidebar
        chats={chats}
        activeChat={activeChat}
        isExpanded={leftSidebarExpanded}
        isVisible={showLeftSidebar}
        onSelectChat={(id) => { setActiveChat(id); setShowLeftSidebar(false); }}
        onNewChat={createNewChat}
        onExpand={() => setLeftSidebarExpanded(true)}
        onCollapse={() => {
          setLeftSidebarExpanded(false);
          if (window.innerWidth < 768) setShowLeftSidebar(false);
        }}
      />

      <ChatArea
        currentChat={currentChat}
        input={input}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        isEditingName={isEditingName}
        editedName={editedName}
        onInputChange={setInput}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onFileUpload={handleFileUpload}
        onStartEditingName={startEditingName}
        onSaveChatName={saveChatName}
        onCancelEditingName={() => setIsEditingName(false)}
        onEditedNameChange={setEditedName}
        onShowLeftSidebar={() => setShowLeftSidebar(true)}
        onShowRightSidebar={() => setShowRightSidebar(true)}
      />

      <RightSidebar
        documents={documents}
        isExpanded={rightSidebarExpanded}
        isVisible={showRightSidebar}
        onExpand={() => setRightSidebarExpanded(true)}
        onCollapse={() => {
          setRightSidebarExpanded(false);
          if (window.innerWidth < 768) setShowRightSidebar(false);
        }}
        onDelete={deleteDocument}
        onUpload={handleFileUpload}
      />
    </div>
  );
}
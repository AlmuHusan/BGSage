import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { Session, Message, Document } from './components/types';
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

async function apiFetchDocuments(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'GET',
    headers: API_HEADERS
  });
  return res.json();
}

async function apiFetchSessions(): Promise<[]> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'GET',
    headers: API_HEADERS
  });
  return res.json();
}

async function apiAskBGSage(query: string, context: string[],sid:number=1): Promise<string> {
  console.log(context)
  if (context as unknown=="Internal Server Error"){
    return "Internal Server Error";
  }
  const res = await fetch(`${API_BASE}/askBGSage`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({ query, context, sid}),
  });
  return res.json();
}

async function apiInsertBook(documentName: string, pages: string[]): Promise<void> {
  await fetch(`${API_BASE}/insertDocument`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({ document: documentName, pages }),
  });
}

async function apiDeleteDocument(documentName: string): Promise<void> {
  await fetch(`${API_BASE}/deleteDocument`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({ document: documentName }),
  });
}

async function apiVectorSearch(queryString: string, filterDocuments?: string[]): Promise<string[]> {
  const res = await fetch(`${API_BASE}/vectorSearch`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({
      queryString,
      filterDocuments,
    }),
  });
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatApp() {
  const [sessions, setSessions] = useState<Session[]>([]);

  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightSidebarExpanded, setRightSidebarExpanded] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const currentSession = sessions.find((s) => s.id === activeSession);

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
    retrieveSessions();
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Chat state helpers ───────────────────────────────────────────────────

  async function retrieveSessions(): Promise<void> {
    try {
      const sessionRes = await apiFetchSessions();
      console.log(sessionRes)
      const sessionData : Session[]=[]
      for(var session of sessionRes as Session[]){
        console.log(session)
        sessionData.push({
          id: session["id"],
          name: session["name"],
          lastMessage: session["messages"].at(-1)!.text,
          time: "",
          unread: 0,
          messages: session["messages"],
        })
      }
      const mapped = sessionRes.map((name, index) => ({
        id: index+1,
        name: name[1],
        lastMessage: "Start a conversation..",
        time: "",
        unread: 0,
        messages: [],
      }));
      setSessions(mapped);
      if (mapped.length > 0) setActiveSession(mapped[0].id);
    } catch (err) {
      console.error('Failed to retrieve sessions:', err);
    }
  }

  function updateChat(sessionId: number | null, updates: Partial<Session>): void {
    setSessions((prev) =>
      prev.map((chat) => (chat.id === sessionId ? { ...chat, ...updates } : chat))
    );
  }

  function addMessageToChat(sessionId: number | null, message: Message, lastMessage: string): void {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, message], lastMessage, time: 'Just now' }
          : session
      )
    );
  }

  // ── Documents ────────────────────────────────────────────────────────────

  async function retrieveDocuments(): Promise<void> {
    try {
      const bookData = await apiFetchDocuments();
      console.log(bookData);
      setDocuments(bookData.map((name, index) => ({ id: index + 1, name, selected: false })));
    } catch (err) {
      console.error('Failed to retrieve documents:', err);
    }
  }

  async function deleteDocument(oldDoc: Document): Promise<void> {
    try {
      await apiDeleteDocument(oldDoc.name);
      setDocuments((prev) => prev.filter((doc) => doc.id !== oldDoc.id));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  }

  function toggleDocSelection(docId: number): void {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, selected: !doc.selected } : doc))
    );
  }


  // Returns selected doc names, or empty array if none or all are selected
  function getFilterDocuments(): string[] {
    const selectedDocs = documents.filter((doc) => doc.selected);

    if (selectedDocs.length === 0) return [];

    return selectedDocs.map((doc) => doc.name);
  }

  // ── Messaging ────────────────────────────────────────────────────────────

  async function handleSend(): Promise<void> {
    const trimmed = input.trim();
    const session = sessions.find((s) => s.id === activeSession);
    if (!trimmed || !session) return;

    const userMessage: Message = {
      id: session.messages.length + 1,
      text: trimmed,
      sender: 'user',
      time: currentTime(),
    };
    const systemMessage: Message = {
      id: session.messages.length + 2,
      text: "",
      sender: 'system',
      time: currentTime(),
    };
    addMessageToChat(activeSession, userMessage, trimmed);
    setInput('');
    console.log(trimmed);

    try {
      const filterDocuments = getFilterDocuments();
      console.log('Filtering by documents:',filterDocuments);
      if(filterDocuments && filterDocuments.length > 0 ){
        const resVectorSearch = await apiVectorSearch(trimmed, filterDocuments);
        console.log(resVectorSearch);

        const resAskBGSage = await apiAskBGSage(trimmed, resVectorSearch);
        systemMessage.time=currentTime()
        systemMessage.text=resAskBGSage
      }
      else{
        systemMessage.time=currentTime()
        systemMessage.text="No Documents selected/uploaded"
      }
      addMessageToChat(activeSession, systemMessage, systemMessage.text);
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

  function createNewSession(): void {
    const newId = sessions.length > 0 ? Math.max(...sessions.map((c) => c.id)) + 1 : 1;
    const newChat: Session = {
      id: newId,
      name: `New Session ${newId}`,
      lastMessage: 'Start a conversation...',
      time: 'Now',
      unread: 0,
      messages: [],
    };
    setSessions((prev) => [newChat, ...prev]);
    setActiveSession(newId);
  }

  function startEditingName(): void {
    if (currentSession) {
      setEditedName(currentSession.name);
      setIsEditingName(true);
    }
  }

  function saveChatName(): void {
    if (editedName.trim()) {
      updateChat(activeSession, { name: editedName.trim() });
      setIsEditingName(false);
    }
  }


  // ── File upload ──────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    const session = sessions.find((s) => s.id === activeSession);
    if (!file || !session) return;

    try {
      const pages = await extractPdfPages(file);
      await apiInsertBook(file.name, pages);

      setDocuments((prev) => [{ id: prev.length + 1, name: file.name, selected: false }, ...prev]);

      const fileMessage: Message = {
        id: session.messages.length + 1,
        text: `📎 Uploaded ${file.name}`,
        sender: 'user',
        time: currentTime(),
        isFile: true,
      };

      addMessageToChat(activeSession, fileMessage, `📎 ${file.name}`);
    } catch (err) {
      console.error('File upload failed:', err);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen max-h-screen bg-background relative overflow-hidden">
      {/* Mobile overlays */}
      {showLeftSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowLeftSidebar(false)} />
      )}
      {showRightSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowRightSidebar(false)} />
      )}

      <LeftSidebar
        sessions={sessions}
        activeSession={activeSession}
        isExpanded={leftSidebarExpanded}
        isVisible={showLeftSidebar}
        onSelectSession={(id) => { setActiveSession(id); setShowLeftSidebar(false); }}
        onNewSession={createNewSession}
        onExpand={() => setLeftSidebarExpanded(true)}
        onCollapse={() => {
          setLeftSidebarExpanded(false);
          if (window.innerWidth < 768) setShowLeftSidebar(false);
        }}
      />

      <ChatArea
        currentSession={currentSession}
        input={input}
        isEditingName={isEditingName}
        editedName={editedName}
        onInputChange={setInput}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        onFileUpload={handleFileUpload}
        onStartEditingName={startEditingName}
        onSaveSessionName={saveChatName}
        onCancelEditingName={() => setIsEditingName(false)}
        onEditedNameChange={setEditedName}
        onShowLeftSidebar={() => setShowLeftSidebar(true)}
        onShowRightSidebar={() => setShowRightSidebar(true)}
      />

      <RightSidebar
        documents={documents}
        isExpanded={rightSidebarExpanded}
        isVisible={showRightSidebar}
        onToggleDoc={toggleDocSelection}
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
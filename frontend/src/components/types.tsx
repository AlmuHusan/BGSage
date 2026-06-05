export interface Message {
  mid: number;
  sid: number;
  content: string;
  chat_role: 'user' | 'system';
  time: string;
  is_file?: boolean;
}
 
export interface Session {
  id: number;
  name: string;
  last_message: string;
  time: string;
  unread: number;
  messages: Message[];
}
 
export interface Document {
  id: number;
  name: string;
  selected: boolean;
}
export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'system';
  time: string;
  isVoice?: boolean;
  isFile?: boolean;
}
 
export interface Session {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  messages: Message[];
}
 
export interface Document {
  id: number;
  name: string;
  selected: boolean;
}
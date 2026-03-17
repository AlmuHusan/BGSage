export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'system';
  time: string;
  isVoice?: boolean;
  isFile?: boolean;
}
 
export interface Chat {
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
}
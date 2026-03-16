'use client';

import React, { createContext, useContext, useState } from 'react';

interface ChatContextType {
  isChatOpen: boolean;
  toggleChat: () => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => setIsChatOpen(prev => !prev);
  const closeChat = () => setIsChatOpen(false);

  return (
    <ChatContext.Provider value={{ isChatOpen, toggleChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatState() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatState must be used within a ChatProvider');
  }
  return context;
}

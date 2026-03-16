'use client';

import React from 'react';
import { Sidebar, Header } from '@/components/layout';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useChatState } from '@/contexts/chatContext';
import { cn } from '@/lib/utils';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isChatOpen, closeChat } = useChatState();

  return (
    <div className="flex fixed inset-0 overflow-hidden bg-slate-50 dark:bg-[#060c15] transition-colors duration-500">
      {/* Animated Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-teal-500/10 dark:bg-teal-500/15 blur-[100px] animate-pulse"
          style={{ animationDuration: '10s' }}
        />
        <div
          className="absolute -bottom-[10%] left-[20%] w-[35%] h-[40%] rounded-full bg-emerald-400/10 dark:bg-emerald-600/15 blur-[110px] animate-pulse"
          style={{ animationDuration: '7s' }}
        />
      </div>

      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex flex-col h-full flex-1 min-w-0 overflow-hidden relative z-10 transition-colors duration-300">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="md:container md:mx-auto md:p-8 p-4 pt-4 md:pt-8 pb-24 md:pb-32 w-full max-w-7xl relative transition-all duration-300">
            {children}
          </div>
        </main>
      </div>

      {/* Backdrop for Mobile */}
      {isChatOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={closeChat}
        />
      )}

      {/* Chat Panel Sliding Output */}
      <div className={cn(
        "fixed md:relative top-0 bottom-0 right-0 z-40 transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
        isChatOpen 
          ? "w-full md:w-[350px] translate-x-0" 
          : "w-full md:w-0 translate-x-full md:translate-x-0"
      )}>
        <ChatPanel 
          isOpen={isChatOpen} 
          onClose={closeChat} 
          className="w-full md:w-[350px] h-full"
        />
      </div>

    </div>
  );
}

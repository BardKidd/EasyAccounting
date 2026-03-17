import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, ExternalLink } from 'lucide-react';
import { ChatMessage } from '@/services/chatService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const ChatMessageBubble = ({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex w-full gap-3 py-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar for AI */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <Bot className="h-5 w-5" />
        </div>
      )}

      {/* Message Bubble */}
      <div className={cn(
        "relative rounded-2xl px-4 py-3 max-w-[85%] text-sm shadow-sm transition-all duration-200",
        isUser 
          ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 rounded-tr-sm" 
          : "bg-white text-slate-700 border border-slate-100 dark:bg-[#1e293b] dark:text-slate-300 dark:border-slate-800 rounded-tl-sm shadow-slate-200/50 dark:shadow-none"
      )}>
        {/* The text content */}
        <div className={cn(
          "leading-relaxed min-w-[30px] w-full max-w-full m-0 p-0 wrap-break-word overflow-hidden",
          isUser && typeof message.content === 'string' ? "whitespace-pre-wrap" : "whitespace-normal"
        )}>
          {isUser ? (
            <div className="flex flex-col gap-2">
              {typeof message.content === 'string' ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                message.content.map((part, idx) => {
                  if (part.type === 'text' && part.text) {
                    return <div key={idx} className="whitespace-pre-wrap">{part.text}</div>;
                  }
                  if (part.type === 'image_url' && part.image_url?.url) {
                    return (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900/50 max-w-sm mt-1">
                        <img src={part.image_url.url} alt="User Uploaded Image" className="w-full h-auto object-cover max-h-60" />
                      </div>
                    );
                  }
                  return null;
                })
              )}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert prose-emerald max-w-none text-slate-700 dark:text-slate-300 wrap-break-word">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({node, ...props}) => <span className="font-bold text-slate-900 dark:text-white" {...props} />,
                  a: ({node, href, children, ...props}) => {
                    if (!href) return <a {...props}>{children}</a>;
                    
                    const isInternal = href.startsWith('/');
                    const LinkWrapper = isInternal ? Link : 'a';
                    const targetProps = isInternal ? {} : { target: "_blank", rel: "noopener noreferrer" };
                    
                    return (
                      <LinkWrapper 
                        href={href as any} 
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 mt-1 mb-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg no-underline transition-colors border border-emerald-200 dark:border-emerald-500/20 shadow-sm whitespace-normal"
                        {...targetProps}
                      >
                        <span className="break-all">{children}</span>
                        {!isInternal && <ExternalLink className="w-3 h-3 shrink-0" />}
                      </LinkWrapper>
                    );
                  },
                  p: ({node, ...props}) => <p className="mb-3 last:mb-0 wrap-break-word" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1 wrap-break-word" {...props} />
                }}
              >
                {typeof message.content === 'string' && message.content.length > 0 ? message.content : (isStreaming ? " " : "")}
              </ReactMarkdown>
            </div>
          )}
          {isStreaming && (
             <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-1 align-middle" />
          )}
        </div>
      </div>

       {/* Avatar for User */}
       {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square, Image as ImageIcon, X } from 'lucide-react';
import { MessageContent } from '@/services/chatService';

interface ChatInputProps {
  onSend: (message: string | MessageContent[]) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, onStop, isGenerating, disabled }: ChatInputProps) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]); // Base64 strings
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 3;

  const handleSend = () => {
    if ((!content.trim() && images.length === 0) || isGenerating || disabled) return;
    
    if (images.length > 0) {
      const payload: MessageContent[] = [];
      if (content.trim()) {
        payload.push({ type: 'text', text: content });
      }
      images.forEach(img => {
        payload.push({ type: 'image_url', image_url: { url: img } });
      });
      onSend(payload);
    } else {
      onSend(content);
    }

    setContent('');
    setImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 判斷是否正在使用輸入法 (IME) 選字，如果是的話就不要觸發發送
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (images.length >= MAX_IMAGES) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImages(prev => {
        if (prev.length >= MAX_IMAGES) return prev;
        return [...prev, base64];
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Only take files up to the limit
    const availableSlots = MAX_IMAGES - images.length;
    const filesToProcess = files.slice(0, availableSlots);
    
    filesToProcess.forEach(processFile);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) processFile(file);
        break; // Process one image per paste to be safe, or remove break to process all
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  return (
    <div className="relative flex flex-col w-full gap-2 p-4 bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/10">
      
      {/* Image Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 mb-1">
          {images.map((img, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 w-16 h-16 bg-slate-100 dark:bg-slate-800 shrink-0">
              <img src={img} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <div className="w-16 h-16 shrink-0 flex items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
              {images.length}/{MAX_IMAGES}
            </div>
          )}
        </div>
      )}

      <div className="relative flex items-end w-full gap-2">
        <input 
          type="file" 
          accept="image/*" 
          multiple 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating || disabled || images.length >= MAX_IMAGES}
          className="h-[44px] w-[44px] rounded-xl shrink-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
          title={`上傳圖片 (最多 ${MAX_IMAGES} 張)`}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>

        <div className="relative flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/30">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isGenerating ? "AI 正在回覆..." : "請輸入文字或貼上截圖..."}
            disabled={isGenerating || disabled}
            className="min-h-[44px] max-h-[120px] resize-none border-0 shadow-none focus-visible:ring-0 py-3 px-4 text-base md:text-sm scrollbar-hide bg-transparent"
            rows={1}
          />
        </div>
        
        {isGenerating ? (
          <Button 
            onClick={onStop}
            size="icon"
            variant="destructive"
            className="h-[44px] w-[44px] rounded-xl shrink-0 shadow-md transition-all hover:scale-105 active:scale-95"
            title="停止產生"
          >
            <Square className="h-5 w-5 fill-current" />
          </Button>
        ) : (
          <Button 
            onClick={handleSend}
            disabled={(!content.trim() && images.length === 0) || disabled}
            size="icon"
            className="h-[44px] w-[44px] rounded-xl shrink-0 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md shadow-emerald-500/20 text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

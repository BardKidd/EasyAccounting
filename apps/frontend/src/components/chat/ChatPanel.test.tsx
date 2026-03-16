import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { ChatPanel } from './ChatPanel';
import { useChat } from '@/hooks/useChat';

// Mock scrollTo for jsdom
beforeAll(() => {
  window.HTMLElement.prototype.scrollTo = vi.fn();
});

vi.mock('@/hooks/useChat', () => ({
  useChat: vi.fn(),
}));

// Mock lucide-react icons if they cause issues
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  BotMessageSquare: () => <div data-testid="icon-bot" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Send: () => <div data-testid="icon-send" />,
  Square: () => <div data-testid="icon-square" />,
  Image: () => <div data-testid="icon-image" />,
  Bot: () => <div data-testid="icon-bot-msg" />,
  User: () => <div data-testid="icon-user-msg" />,
  ExternalLink: () => <div data-testid="icon-ext-link" />,
}));

describe('ChatPanel', () => {
  it('should render empty state correctly', () => {
    (useChat as any).mockReturnValue({
      messages: [],
      isGenerating: false,
      error: null,
      sendMessage: vi.fn(),
      stopGenerating: vi.fn(),
    });

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('AI 系統助手')).toBeInTheDocument();
    expect(screen.getByText('您好！我是 EasyAccounting 助手')).toBeInTheDocument();
  });

  it('should render messages', () => {
    (useChat as any).mockReturnValue({
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'ai', content: 'Hi there' },
      ],
      isGenerating: false,
      error: null,
      sendMessage: vi.fn(),
      stopGenerating: vi.fn(),
    });

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('should show error message', () => {
    (useChat as any).mockReturnValue({
      messages: [],
      isGenerating: false,
      error: 'Something went wrong',
      sendMessage: vi.fn(),
      stopGenerating: vi.fn(),
    });

    render(<ChatPanel isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    (useChat as any).mockReturnValue({
      messages: [],
      isGenerating: false,
      error: null,
      sendMessage: vi.fn(),
      stopGenerating: vi.fn(),
    });

    const onClose = vi.fn();
    render(<ChatPanel isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByTestId('icon-x').parentElement;
    if (closeButton) fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});

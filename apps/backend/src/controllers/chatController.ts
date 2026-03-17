import express, { Request, Response } from 'express';
import { streamChatResponse } from '@/services/chatService';

export const handleChat = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { message, history } = req.body;

  if (!message || (typeof message !== 'string' && !Array.isArray(message))) {
    res
      .status(400)
      .json({
        error:
          'Message is required and must be a string or array of multimodal contents',
      });
    return;
  }

  const chatHistory = history || [];

  // Setup Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // 避免伺服器等全部資料完成才回傳，這樣也可以讓前端頁面有打字機效果出現。
  });

  // Handle client disconnect to stop the stream early
  let isClientDisconnected = false;
  req.on('close', () => {
    isClientDisconnected = true;
    console.log('[chatController] Client dropped SSE connection');
  });

  try {
    await streamChatResponse(message, chatHistory, (chunk: string) => {
      if (isClientDisconnected) {
        // You could throw an abort error here if the service layer supported it
        return;
      }
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    });

    if (!isClientDisconnected) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    if (!isClientDisconnected) {
      console.error('[chatController] Streaming error:', error);
      res.write(
        `data: ${JSON.stringify({ error: 'Failed to process chat request' })}\n\n`,
      );
      res.end();
    }
  }
};

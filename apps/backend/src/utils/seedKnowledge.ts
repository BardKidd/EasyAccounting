import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import KnowledgeChunk from '@/models/knowledgeChunk';
import { generateEmbedding } from '@/services/chatService';
import mongoConnection from '@/utils/mongodb';

dotenv.config();

// 指定存放 spec 的目錄
const DOCS_DIR = path.resolve(__dirname, '../../../../docs/specs');

/**
 * 簡單的 Markdown 切割工具
 * 依據標題 (##, ###) 將長文檔切塊
 */
const splitMarkdownIntoChunks = (content: string, sourceName: string) => {
  const lines = content.split('\n');
  const chunks: Array<{ content: string; section: string }> = [];
  
  let currentSection = 'General';
  let currentContent = '';

  for (const line of lines) {
    // 遇到標題就切出一塊
    if (line.match(/^#{2,3}\s/)) {
      if (currentContent.trim()) {
        chunks.push({
          content: `[Source: ${sourceName} | Section: ${currentSection}]\n${currentContent.trim()}`,
          section: currentSection,
        });
      }
      currentSection = line.replace(/^#{2,3}\s/, '').trim();
      currentContent = line + '\n';
    } else {
      currentContent += line + '\n';
    }
  }

  // 處理最後一部份
  if (currentContent.trim()) {
    chunks.push({
      content: `[Source: ${sourceName} | Section: ${currentSection}]\n${currentContent.trim()}`,
      section: currentSection,
    });
  }

  return chunks;
};

const searchMarkdownFiles = (dirPath: string): string[] => {
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dirPath);
    list.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        // Recursive search in subdirectories (like ai-chat-panel)
        results = results.concat(searchMarkdownFiles(fullPath));
      } else if (file.endsWith('.md')) {
        results.push(fullPath);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);
  }
  return results;
};

export const seedKnowledgeBase = async () => {
  try {
    console.log('--- Starting Knowledge Base Seeding ---');
    await mongoConnection();

    console.log('1. Clearing existing knowledge chunks...');
    await KnowledgeChunk.deleteMany({});

    console.log(`2. Scanning for markdown files in ${DOCS_DIR}...`);
    const files = searchMarkdownFiles(DOCS_DIR);
    
    if (files.length === 0) {
      console.log('No Markdown files found. Exiting.');
      return;
    }

    console.log(`Found ${files.length} markdown files.`);

    let totalChunks = 0;

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      
      // We don't need to seed tasks.md files, mostly specs
      if (fileName.includes('tasks.md')) continue;

      console.log(`Processing file: ${fileName}...`);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const chunks = splitMarkdownIntoChunks(content, fileName);
      console.log(`  -> Split into ${chunks.length} chunks`);

      for (const chunk of chunks) {
        if (!chunk.content.trim()) continue;

        try {
          // Generate embedding for chunk
          const embedding = await generateEmbedding(chunk.content);
          
          await KnowledgeChunk.create({
            content: chunk.content,
            embedding,
            metadata: {
              source: fileName,
              section: chunk.section,
            }
          });
          totalChunks++;
          
          // Rate limit protection for Google AI API
          await new Promise(r => setTimeout(r, 500)); 
        } catch (embedError) {
          console.error(`  -> Error generating embedding for section ${chunk.section}:`, embedError);
        }
      }
    }

    console.log('--- Seeding Complete ---');
    console.log(`Total chunks inserted: ${totalChunks}`);

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    mongoose.disconnect();
  }
};

// 如果是直接執行這個檔案
if (require.main === module) {
  seedKnowledgeBase().then(() => process.exit(0));
}

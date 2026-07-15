'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export interface PreviewImage {
  id: string;
  file: File;
  previewUrl: string;
  selected: boolean;
}

interface PdfPreviewGridProps {
  images: PreviewImage[];
  onImagesChange: (images: PreviewImage[]) => void;
  onConfirm: (notifyEmail: boolean) => void;
  onCancel: () => void;
}

export function PdfPreviewGrid({
  images,
  onImagesChange,
  onConfirm,
  onCancel,
}: PdfPreviewGridProps) {
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const toggleSelection = (id: string, currentlySelected: boolean) => {
    onImagesChange(
      images.map((img) =>
        img.id === id ? { ...img, selected: !currentlySelected } : img,
      ),
    );
  };

  const selectAll = (select: boolean) => {
    onImagesChange(images.map((img) => ({ ...img, selected: select })));
  };

  const selectedCount = images.filter((img) => img.selected).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-outfit bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-white/60 bg-clip-text text-transparent">
            預覽與篩選
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
            請勾選含有交易明細的頁面，取消勾選廣告或其他無用頁面以加快解析速度。
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => selectAll(true)}
            className="rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            全部選取
          </Button>
          <Button
            variant="outline"
            onClick={() => selectAll(false)}
            className="rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            取消全選
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {images.map((img, index) => (
          <div
            key={img.id}
            className={`relative group rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl border ${
              img.selected
                ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/10'
                : 'border-slate-200/50 dark:border-white/10'
            }`}
          >
            {/* Image Preview */}
            <div className="aspect-[1/1.4] bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={`Page ${index + 1}`}
                className={`w-full h-full object-contain transition-transform duration-500 ${!img.selected && 'opacity-70 grayscale-30'} group-hover:scale-105`}
              />
            </div>

            {/* Selection Overlay */}
            <div
              className={`absolute inset-0 cursor-pointer transition-colors duration-300 ${
                img.selected
                  ? 'bg-emerald-500/10'
                  : 'bg-black/5 hover:bg-black/20 dark:bg-black/20 dark:hover:bg-black/40'
              }`}
              onClick={() => toggleSelection(img.id, img.selected)}
            >
              <div
                className={`absolute top-4 left-4 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${
                  img.selected
                    ? 'bg-emerald-500 border-emerald-500 text-white scale-110'
                    : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500!'
                }`}
              >
                <Check
                  className={`w-5 h-5 ${img.selected ? 'opacity-100' : 'opacity-0'}`}
                  strokeWidth={3}
                />
              </div>
            </div>

            {/* Magnifier Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImage(img.previewUrl);
              }}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-white hover:text-emerald-600 dark:hover:bg-slate-700 dark:hover:text-emerald-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 shadow-lg scale-100 md:scale-90 md:group-hover:scale-100 z-10 backdrop-blur-md"
              title="放大預覽"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 text-sm font-bold text-center border-t border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-300">
              第 {index + 1} 頁
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="notifyEmail"
            checked={notifyEmail}
            onCheckedChange={(checked) => setNotifyEmail(checked as boolean)}
            className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300 dark:border-slate-600"
          />
          <label
            htmlFor="notifyEmail"
            className="grid leading-none gap-1.5 cursor-pointer group"
          >
            <span className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              處理完成時以 Email 通知我
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              背景處理可能需要數分鐘，勾選此項以便完成後收到通知。
            </span>
          </label>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={onCancel}
            className="flex-1 md:flex-none rounded-xl font-medium"
          >
            取消處理
          </Button>
          <Button
            onClick={() => onConfirm(notifyEmail)}
            disabled={selectedCount === 0}
            size="lg"
            className="flex-1 md:flex-none rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5"
          >
            開始上傳與解析 ({selectedCount} 頁)
          </Button>
        </div>
      </div>

      <Dialog
        open={!!zoomedImage}
        onOpenChange={(open) => {
          if (!open) {
            setZoomedImage(null);
            setTimeout(() => setScale(1), 200); // Reset scale after animation
          }
        }}
      >
        <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-3 border-b bg-background z-10 flex flex-row items-center justify-between">
            <DialogTitle>放大預覽</DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 md:h-8 md:w-8"
                onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 md:h-8 md:w-8"
                onClick={() => setScale((s) => Math.min(s + 0.5, 3))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 md:h-8 md:w-8 ml-2"
                onClick={() => setScale(1)}
                title="重置大小"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted p-4">
            <div className="min-h-full flex items-center justify-center">
              {zoomedImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={zoomedImage}
                  alt="Zoomed preview"
                  style={{
                    height: `${scale * 80}vh`,
                    width: 'auto',
                    maxWidth: 'none',
                  }}
                  className="shadow-lg transition-all duration-200 object-contain"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

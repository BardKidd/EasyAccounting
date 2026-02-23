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
        <div>
          <h2 className="text-xl font-semibold">預覽與篩選上傳頁面</h2>
          <p className="text-sm text-muted-foreground mt-1">
            請勾選含有交易明細的頁面，取消勾選廣告或其他無用頁面以加快解析速度。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => selectAll(true)}>
            全選
          </Button>
          <Button variant="outline" onClick={() => selectAll(false)}>
            取消全選
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {images.map((img, index) => (
          <div
            key={img.id}
            className={`relative group rounded-lg border-2 overflow-hidden transition-all ${
              img.selected
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-muted-foreground/20'
            }`}
          >
            {/* Image Preview */}
            <div className="aspect-[1/1.4] bg-muted flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={`Page ${index + 1}`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Selection Overlay */}
            <div
              className={`absolute inset-0 cursor-pointer ${
                img.selected ? 'bg-primary/10' : 'bg-black/5 hover:bg-black/10'
              }`}
              onClick={() => toggleSelection(img.id, img.selected)}
            >
              <div
                className={`absolute top-3 left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  img.selected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background/80 border-muted-foreground'
                }`}
              >
                {img.selected && <Check className="w-4 h-4" />}
              </div>
            </div>

            {/* Magnifier Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImage(img.previewUrl);
              }}
              className="absolute top-3 right-3 p-2 rounded-full bg-background/80 text-foreground hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
              title="放大預覽"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-background/90 px-3 py-2 text-sm font-medium border-t">
              第 {index + 1} 頁
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="notifyEmail"
            checked={notifyEmail}
            onCheckedChange={(checked) => setNotifyEmail(checked as boolean)}
          />
          <div className="grid leading-none pt-0.5">
            <label
              htmlFor="notifyEmail"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              處理完成時以 Email 通知我
            </label>
            <p className="text-sm text-muted-foreground mt-1">
              背景處理可能需要數分鐘，勾選此項以便完成後收到通知。
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            取消
          </Button>
          <Button
            onClick={() => onConfirm(notifyEmail)}
            disabled={selectedCount === 0}
            className="flex-1"
          >
            開始上傳與解析 ({selectedCount})
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
                className="h-8 w-8"
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
                className="h-8 w-8"
                onClick={() => setScale((s) => Math.min(s + 0.5, 3))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 ml-2"
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

'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account } from '@repo/shared';
import { Plus } from 'lucide-react';

function NewAccountDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          新增帳戶
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新增帳戶</DialogTitle>
          <DialogDescription>
            建立一個新的資產帳戶以追蹤您的資金流向。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              名稱
            </Label>
            <Input
              id="name"
              placeholder="例如: 薪轉戶"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              類型
            </Label>
            <Select>
              <SelectTrigger className="col-span-3 cursor-pointer w-full">
                <SelectValue placeholder="選擇帳戶類型" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Account).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balance" className="text-right">
              初始餘額
            </Label>
            <Input
              id="balance"
              type="number"
              defaultValue="0"
              className="col-span-3"
            />
          </div>
          {/* Color picker could be added here */}
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="cursor-pointer">
            建立帳戶
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewAccountDialog;

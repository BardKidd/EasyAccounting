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
import { Account, CreateAccountInput, PaymentStatus } from '@repo/shared';
import { HexColorPicker } from 'react-colorful';
import IconPicker from '@/components/ui/icon-picker';
import { Plus } from 'lucide-react';
import services from '@/services';
import { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAccountSchema } from '@repo/shared';
import { getErrorMessage, simplifyTryCatch } from '@/lib/utils';
import { toast } from 'sonner';

function NewAccountDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: '',
      type: Account.CASH,
      balance: 0,
      icon: 'wallet',
      color: '#aabbcc',
      isActive: true,
      creditLimit: undefined,
      unpaidAmount: undefined,
      billingDay: undefined,
      nextBillingDate: undefined,
      paymentStatus: undefined,
    },
  });

  const onSubmit = async (data: CreateAccountInput) => {
    try {
      console.log(data);

      const res = await services.createAccount(data);
      if (res.isSuccess) {
        toast.success(res.message);
        form.reset();
        setIsOpen(false);
      } else {
        toast.error(getErrorMessage(res.error));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center justify-center">
                        <IconPicker
                          icon={field.value}
                          setIcon={field.onChange}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          名稱
                        </Label>
                        <Input
                          id="name"
                          placeholder="例如: 薪轉戶"
                          className="col-span-3"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <div className="col-span-1" />
                      <FormMessage className="col-span-3" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                          類型
                        </Label>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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
                    </FormControl>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <div className="col-span-1" />
                      <FormMessage className="col-span-3" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="balance" className="text-right">
                          初始餘額
                        </Label>
                        <Input
                          id="balance"
                          type="number"
                          className="col-span-3"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          onFocus={(e) => {
                            if (field.value === 0) {
                              e.target.value = '';
                            }
                          }}
                          // 假如有人還是故意打 0 的話再離開時會把它清掉
                          onBlur={(e) => {
                            e.target.value = String(field.value);
                          }}
                        />
                      </div>
                    </FormControl>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <div className="col-span-1" />
                      <FormMessage className="col-span-3" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="color" className="text-right">
                          色彩
                        </Label>
                        <Input
                          id="color"
                          type="text"
                          className="col-span-3"
                          {...field}
                        />
                        <div
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: field.value }}
                        />
                        <HexColorPicker
                          color={field.value}
                          onChange={field.onChange}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="cursor-pointer">
                建立帳戶
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default NewAccountDialog;

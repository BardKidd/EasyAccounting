'use clients';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HexColorPicker } from 'react-colorful';
import IconPicker from '@/components/ui/icon-picker';
import { useEffect } from 'react';
import { Account, CreateAccountInput, UpdateAccountInput } from '@repo/shared';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import services from '@/services';
import { useRouter } from 'next/navigation';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAccountSchema } from '@repo/shared';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

const days = Array.from({ length: 31 }, (_, i) => i + 1);

const AccountForm = ({
  selectedAccount,
  isOpen,
  setIsOpen,
  onTypeChange,
}: {
  selectedAccount?: UpdateAccountInput | null;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  onTypeChange?: (type: Account) => void;
}) => {
  const defaultValues: CreateAccountInput = {
    name: '',
    type: Account.CASH,
    balance: 0,
    icon: 'wallet',
    color: '#aabbcc',
    isArchived: false,
    creditCardDetail: {
      statementDate: 1,
      paymentDueDate: 10,
      gracePeriod: 0,
      interestRate: 0,
      creditLimit: 0,
      includeInTotal: true,
    },
  };
  const form = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues,
  });

  const isEditMode = !!selectedAccount;
  const router = useRouter();
  const type = form.watch('type');

  useEffect(() => {
    onTypeChange?.(type as Account);
  }, [type, onTypeChange]);

  const onSubmit = async (data: CreateAccountInput | UpdateAccountInput) => {
    try {
      let res;

      if (data.type !== Account.CREDIT_CARD) {
        delete (data as any).creditCardDetail;
      }

      if (isEditMode) {
        res = await services.updateAccount({
          ...selectedAccount,
          ...data,
          id: (selectedAccount as any).id, // Ensure ID is passed
        });
      } else {
        res = await services.createAccount(data);
      }

      if (res.isSuccess) {
        toast.success(res.message);
        form.reset(defaultValues);
        if (setIsOpen) {
          setIsOpen(false);
        }
        router.refresh();
      } else {
        toast.error(getErrorMessage(res.error));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!!selectedAccount) {
        form.reset({
          ...defaultValues,
          ...selectedAccount,
          creditCardDetail:
            selectedAccount.creditCardDetail || defaultValues.creditCardDetail,
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [selectedAccount, isOpen, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div
          className={
            type === Account.CREDIT_CARD
              ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
              : 'grid gap-4 py-4'
          }
        >
          {/* Left Column (Basic Info) */}
          <div className="space-y-4">
            <h3
              className={
                type === Account.CREDIT_CARD
                  ? 'font-semibold text-lg mb-4'
                  : 'hidden'
              }
            >
              基本資訊
            </h3>
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center justify-center">
                      <IconPicker icon={field.value} setIcon={field.onChange} />
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
                        key={field.value}
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
                        {isEditMode ? '目前餘額' : '初始餘額'}
                      </Label>
                      <Input
                        id="balance"
                        type="number"
                        className="col-span-3"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        onFocus={(e) => {
                          if (field.value === 0) {
                            e.target.value = '';
                          }
                        }}
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

            {isEditMode && (
              <FormField
                control={form.control}
                name="isArchived"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isArchived" className="text-right">
                          是否封存
                        </Label>
                        <Switch
                          id="isArchived"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Right Column (Credit Card Settings) */}
          {type === Account.CREDIT_CARD && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">信用卡設定</h3>
              <div className="border rounded-md p-4 space-y-4 bg-gray-50 dark:bg-zinc-900/50">
                <FormField
                  control={form.control}
                  name="creditCardDetail.creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">信用額度</Label>
                          <Input
                            type="number"
                            className="col-span-3"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditCardDetail.statementDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">結帳日</Label>
                          <Select
                            value={String(field.value)}
                            onValueChange={(v) => field.onChange(Number(v))}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="選擇日期" />
                            </SelectTrigger>
                            <SelectContent>
                              {days.map((d) => (
                                <SelectItem key={d} value={String(d)}>
                                  {d}日
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditCardDetail.paymentDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">繳款日</Label>
                          <Select
                            value={String(field.value)}
                            onValueChange={(v) => field.onChange(Number(v))}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="選擇日期" />
                            </SelectTrigger>
                            <SelectContent>
                              {days.map((d) => (
                                <SelectItem key={d} value={String(d)}>
                                  {d}日
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditCardDetail.gracePeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">寬限期 (天)</Label>
                          <Input
                            type="number"
                            className="col-span-3"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditCardDetail.interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">循環利率 (%)</Label>
                          <Input
                            type="number"
                            className="col-span-3"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditCardDetail.includeInTotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">計入總資產</Label>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="cursor-pointer">
            {isEditMode ? '更新帳戶' : '建立帳戶'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AccountForm;

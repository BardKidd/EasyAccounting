'use client';

import { InfoLayout } from '@/components/landing/info-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, Send } from 'lucide-react';

export default function ContactPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 這裡可以串接 API
    alert('感謝您的回饋！我們將盡快與您聯繫。');
  };

  return (
    <InfoLayout
      title="聯絡我們"
      subtitle="有任何問題、建議或合作想法嗎？歡迎隨時與我們聯繫，我們會盡快回覆您。"
    >
      <div className="grid md:grid-cols-5 gap-12">
        {/* Contact Info */}
        <div className="md:col-span-2 space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">電子郵件</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">support@easyaccounting.com</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">技術支援</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">週一至週五 09:00 - 18:00 (GMT+8)</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">姓名</label>
                <Input placeholder="王小明" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">電子郵件</label>
                <Input type="email" placeholder="example@gmail.com" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">主旨</label>
              <Input placeholder="我有個功能建議..." className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">訊息內容</label>
              <Textarea
                placeholder="請輸入您的訊息..."
                className="min-h-[150px] rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50"
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold hover:opacity-90 transition-opacity">
              <Send className="w-4 h-4 mr-2" />
              發送訊息
            </Button>
          </form>
        </div>
      </div>
    </InfoLayout>
  );
}

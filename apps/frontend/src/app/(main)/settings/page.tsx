import { Container } from '@/components/ui/container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategorySettings } from '@/components/settings/categorySettings';
import { NotificationSettings } from '@/components/settings/notificationSettings';
import { PushNotificationCard } from '@/components/settings/pushNotificationCard';
import { CurrencySettings } from '@/components/settings/currencySettings';
import { TagSettings } from '@/components/settings/tagSettings';
import { ProfileSettings } from '@/components/settings/profileSettings';
import { resolveSettingsTab } from '@/components/settings/settingsTabs';
import service from '@/services';
// import { ExcelExportButton } from '@/components/common/ExcelExportButton';
// import ExcelImportButton from '@/components/common/ExcelImportButton';
import { PageType } from '@repo/shared';

const TAB_TRIGGER_CLASS =
  'cursor-pointer rounded-full px-8 py-2 md:px-10 text-sm font-medium transition-all duration-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 data-[state=active]:hover:text-white max-md:w-full max-md:px-3';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SettingsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const activeTab = resolveSettingsTab(searchParams.tab);
  const categories = await service.getCategories();
  const notifications = await service.getPersonnelNotification();

  return (
    <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold font-outfit uppercase tracking-widest bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent drop-shadow-sm">
            設定
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            管理您的應用程式偏好設定與分類
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* <ExcelImportButton  />
          <ExcelExportButton type={PageType.SETTINGS} /> */}
        </div>
      </div>
      <Tabs key={activeTab} defaultValue={activeTab} className="space-y-8">
        <TabsList className="inline-flex h-12 items-center justify-center rounded-full bg-slate-100 dark:bg-[#0f172a]/80 backdrop-blur-md p-1 border border-slate-200/50 dark:border-white/10 mb-4 shadow-sm relative max-md:grid max-md:grid-cols-2 max-md:h-auto max-md:w-full max-md:gap-1 max-md:rounded-2xl">
          <TabsTrigger
            value="categories"
            className={TAB_TRIGGER_CLASS}
          >
            分類管理
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className={TAB_TRIGGER_CLASS}
          >
            通知設定
          </TabsTrigger>
          <TabsTrigger
            value="currency"
            className={TAB_TRIGGER_CLASS}
          >
            貨幣設定
          </TabsTrigger>
          <TabsTrigger
            value="tags"
            className={TAB_TRIGGER_CLASS}
          >
            標籤管理
          </TabsTrigger>
          <TabsTrigger value="profile" className={TAB_TRIGGER_CLASS}>
            個人檔案
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="categories"
          className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        >
          <CategorySettings categories={categories} />
        </TabsContent>
        <TabsContent
          value="notifications"
          className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        >
          <PushNotificationCard />
          <NotificationSettings notifications={notifications} />
        </TabsContent>
        <TabsContent
          value="currency"
          className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        >
          <CurrencySettings />
        </TabsContent>
        <TabsContent
          value="tags"
          className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        >
          <TagSettings />
        </TabsContent>
        <TabsContent
          value="profile"
          className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        >
          <ProfileSettings />
        </TabsContent>
      </Tabs>
    </Container>
  );
}

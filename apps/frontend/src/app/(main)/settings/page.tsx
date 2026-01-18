import { Container } from '@/components/ui/container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategorySettings } from '@/components/settings/categorySettings';
import { NotificationSettings } from '@/components/settings/notificationSettings';
import service from '@/services';
// import { ExcelExportButton } from '@/components/common/ExcelExportButton';
// import ExcelImportButton from '@/components/common/ExcelImportButton';
import { PageType } from '@repo/shared';

export default async function SettingsPage() {
  const categories = await service.getCategories();
  const notifications = await service.getPersonnelNotification();

  return (
    <Container className="max-w-5xl py-10 space-y-10">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
            設定
          </h2>
          <p className="text-muted-foreground">
            管理您的應用程式偏好設定與分類
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* <ExcelImportButton  />
          <ExcelExportButton type={PageType.SETTINGS} /> */}
        </div>
      </div>
      <Tabs defaultValue="categories" className="space-y-8">
        <TabsList className="bg-transparent p-0 border-b border-border/50 w-full justify-start rounded-none h-auto">
          <TabsTrigger
            value="categories"
            className="cursor-pointer rounded-none border-b-2 border-transparent px-4 py-2 text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all hover:text-foreground"
          >
            分類管理
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="cursor-pointer rounded-none border-b-2 border-transparent px-4 py-2 text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all hover:text-foreground"
          >
            通知設定
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
          <NotificationSettings notifications={notifications} />
        </TabsContent>
      </Tabs>
    </Container>
  );
}

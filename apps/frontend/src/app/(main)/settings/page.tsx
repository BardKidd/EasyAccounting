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
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">設定</h2>
        <div className="flex items-center gap-2">
          {/* <ExcelImportButton  />
          <ExcelExportButton type={PageType.SETTINGS} /> */}
        </div>
      </div>
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" className="cursor-pointer">
            分類管理
          </TabsTrigger>
          <TabsTrigger value="notifications" className="cursor-pointer">
            通知設定
          </TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="space-y-4">
          <CategorySettings categories={categories} />
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings notifications={notifications} />
        </TabsContent>
      </Tabs>
    </Container>
  );
}

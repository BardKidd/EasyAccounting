import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ACCOUNT_ICONS, IconName } from '@/lib/icon-mapping';

const IconPicker = ({
  icon,
  setIcon,
}: {
  icon: string | undefined;
  setIcon: (icon: string) => void;
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full w-20 h-20 cursor-pointer"
        >
          {icon && ACCOUNT_ICONS[icon as IconName] ? (
            <>
              {(() => {
                const Icon = ACCOUNT_ICONS[icon as IconName];
                return <Icon className="!size-12" />; // 不知道為什麼要用 important 才蓋的過去
              })()}
            </>
          ) : (
            '選擇圖示'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(ACCOUNT_ICONS).map(([name, Icon]) => (
            <Button
              key={name}
              variant={icon === name ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setIcon(name)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;

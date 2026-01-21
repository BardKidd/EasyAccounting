import { getIcon } from '@/lib/icon-mapping';
import { cn } from '@/lib/utils';
import { LucideProps } from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  iconName?: string | null;
}

export function CategoryIcon({
  iconName,
  className,
  ...props
}: CategoryIconProps) {
  const Icon = getIcon(iconName);

  return <Icon className={cn('h-4 w-4', className)} {...props} />;
}

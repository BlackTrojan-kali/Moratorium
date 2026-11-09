/// <reference types="vite/client" />

declare module 'lucide-react' {
  import * as React from 'react';

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
    className?: string;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    React.PropsWithoutRef<LucideProps> & React.RefAttributes<SVGSVGElement>
  >;

  const icon: LucideIcon;
  export default icon;
  export {
    icon as LayoutDashboard,
    icon as Bell,
    icon as Files,
    icon as FilePlus,
    icon as CalendarDays,
    icon as Folder,
    icon as Building2,
    icon as Inbox,
    icon as ClipboardCheck,
    icon as Undo2,
    icon as Search,
    icon as Gavel,
    icon as History,
    icon as CalendarRange,
    icon as Landmark,
    icon as TriangleAlert,
    icon as ChartColumn,
    icon as Users,
    icon as ShieldCheck,
    icon as Workflow,
    icon as Database,
    icon as Mail,
    icon as Settings,
    icon as BadgeDollarSign,
    icon as ScrollText,
    icon as Download,
    icon as User,
    icon as CircleHelp,
    icon as LogOut,
    icon as ChevronsLeft,
    icon as Menu,
    icon as UserRound,
    icon as X,
    icon as Eye,
    icon as EyeOff,
    icon as Plus,
    icon as BellRing,
    icon as CheckCheck,
    icon as RefreshCw,
    icon as Check,
    icon as FileText,
    icon as ArrowRight,
    icon as ArrowLeft,
    icon as ShieldAlert,
    icon as LockKeyhole,
    icon as Pencil,
    icon as FileQuestion,
    icon as BookOpen,
    icon as ChevronDown,
    icon as Clock,
    icon as Phone,
  };
}

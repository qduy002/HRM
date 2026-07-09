import { useState } from "react";
import { NavLink, useParams } from "react-router";
import {
  LayoutDashboard,
  Building2,
  Network,
  Briefcase,
  Award,
  Users,
  Clock,
  CalendarClock,
  ClipboardCheck,
  UserCheck,
  CalendarDays,
  ClipboardList,
  Palette,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles?: string[]; // Không set = tất cả roles thấy. Có set = chỉ những role trong list.
  requiresEmployee?: boolean; // Nếu true, chỉ hiện khi user.hasEmployee
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const HR = ["admin", "hr"];
const MGR_HR = ["admin", "hr", "manager"];
const ALL_TENANT = ["admin", "hr", "manager", "employee"];

const buildNav = (companyCode: string): { top: NavItem[]; groups: NavGroup[] } => ({
  top: [{ label: "Tổng quan", path: `/${companyCode}/dashboard`, icon: LayoutDashboard }],
  groups: [
    {
      label: "Tổ chức",
      items: [
        { label: "Chi nhánh", path: `/${companyCode}/branches`, icon: Building2, roles: HR },
        { label: "Phòng ban", path: `/${companyCode}/departments`, icon: Network, roles: HR },
        { label: "Chức danh", path: `/${companyCode}/positions`, icon: Briefcase, roles: HR },
        { label: "Cấp bậc", path: `/${companyCode}/levels`, icon: Award, roles: HR },
      ],
    },
    {
      label: "Nhân sự",
      items: [
        { label: "Danh sách nhân viên", path: `/${companyCode}/employees`, icon: Users, roles: HR },
      ],
    },
    {
      label: "Chấm công",
      items: [
        {
          label: "Chấm công của tôi",
          path: `/${companyCode}/my-attendance`,
          icon: UserCheck,
          roles: ALL_TENANT,
          requiresEmployee: true,
        },
        { label: "Ca làm việc", path: `/${companyCode}/shifts`, icon: Clock, roles: HR },
        {
          label: "Lịch làm việc",
          path: `/${companyCode}/work-schedules`,
          icon: CalendarClock,
          roles: HR,
        },
        {
          label: "Bảng chấm công",
          path: `/${companyCode}/attendance-report`,
          icon: ClipboardCheck,
          roles: HR,
        },
      ],
    },
    {
      label: "Nghỉ phép",
      items: [
        {
          label: "Đơn phép của tôi",
          path: `/${companyCode}/my-leaves`,
          icon: CalendarDays,
          roles: ALL_TENANT,
          requiresEmployee: true,
        },
        {
          label: "Đơn chờ duyệt",
          path: `/${companyCode}/leaves-pending`,
          icon: ClipboardList,
          roles: MGR_HR,
        },
        {
          label: "Danh sách đơn phép",
          path: `/${companyCode}/leaves`,
          icon: ClipboardList,
          roles: HR,
        },
        {
          label: "Loại phép",
          path: `/${companyCode}/leave-types`,
          icon: Palette,
          roles: HR,
        },
      ],
    },
  ],
});

const Sidebar = () => {
  const { companyCode } = useParams<{ companyCode: string }>();
  const { user, hasEmployee } = useAuthStore();
  const role = user?.role ?? "employee";
  const nav = buildNav(companyCode || "");

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Tổ chức": true,
    "Nhân sự": true,
    "Chấm công": true,
    "Nghỉ phép": true,
  });

  const toggle = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-primary text-primary-foreground font-medium"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    );

  const canSee = (item: NavItem) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.requiresEmployee && !hasEmployee) return false;
    return true;
  };

  return (
    <aside className="w-64 border-r bg-background flex flex-col">
      <div className="h-16 border-b flex items-center px-4">
        <h1 className="font-bold text-lg">HRM System</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1">
          {nav.top.filter(canSee).map((item) => (
            <NavLink key={item.path} to={item.path} className={linkClass}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        {nav.groups.map((group) => {
          const visibleItems = group.items.filter(canSee);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="space-y-1">
              <button
                onClick={() => toggle(group.label)}
                className="w-full flex items-center gap-2 px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                {openGroups[group.label] ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {group.label}
              </button>
              {openGroups[group.label] && (
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink key={item.path} to={item.path} className={linkClass}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

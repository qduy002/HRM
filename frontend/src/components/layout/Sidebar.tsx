import { useState } from "react";
import { NavLink, useParams } from "react-router";
import {
  LayoutDashboard,
  Building2,
  Network,
  Briefcase,
  Award,
  Users,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const buildNav = (companyCode: string): { top: NavItem[]; groups: NavGroup[] } => ({
  top: [{ label: "Tổng quan", path: `/${companyCode}/dashboard`, icon: LayoutDashboard }],
  groups: [
    {
      label: "Tổ chức",
      items: [
        { label: "Chi nhánh", path: `/${companyCode}/branches`, icon: Building2 },
        { label: "Phòng ban", path: `/${companyCode}/departments`, icon: Network },
        { label: "Chức danh", path: `/${companyCode}/positions`, icon: Briefcase },
        { label: "Cấp bậc", path: `/${companyCode}/levels`, icon: Award },
      ],
    },
    {
      label: "Nhân sự",
      items: [
        { label: "Danh sách nhân viên", path: `/${companyCode}/employees`, icon: Users },
      ],
    },
  ],
});

const Sidebar = () => {
  const { companyCode } = useParams<{ companyCode: string }>();
  const nav = buildNav(companyCode || "");

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Tổ chức": true,
    "Nhân sự": true,
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

  return (
    <aside className="w-64 border-r bg-background flex flex-col">
      <div className="h-16 border-b flex items-center px-4">
        <h1 className="font-bold text-lg">HRM System</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1">
          {nav.top.map((item) => (
            <NavLink key={item.path} to={item.path} className={linkClass}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        {nav.groups.map((group) => (
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
                {group.items.map((item) => (
                  <NavLink key={item.path} to={item.path} className={linkClass}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

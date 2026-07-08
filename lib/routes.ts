import {IconType} from "react-icons";
import {
  LuChartBar,
  LuPiggyBank,
  LuSettings2,
  LuTrendingDown,
  LuTrendingUp,
} from "react-icons/lu";

export type Route = {
  label: string;
  basePath: string;
  href: string;
  icon: IconType;
};

export const routes: Route[] = [
  {label: "Dashboard", basePath: "/dashboard", href: "/dashboard", icon: LuChartBar},
  {label: "Income", basePath: "/income", href: "/income/fixed", icon: LuTrendingUp},
  {label: "Expense", basePath: "/expense", href: "/expense/fixed", icon: LuTrendingDown},
  {label: "Budget", basePath: "/budget", href: "/budget", icon: LuPiggyBank},
  {label: "Settings", basePath: "/settings", href: "/settings", icon: LuSettings2},
];

export function getActiveRoute(pathname: string) {
  return routes.find((route) => {
    if (route.basePath === "/") {
      return pathname === "/";
    }

    return pathname === route.basePath || pathname.startsWith(`${route.basePath}/`);
  });
}

export function isActiveRoute(pathname: string, route: Route) {
  return pathname === route.basePath || pathname.startsWith(`${route.basePath}/`);
}
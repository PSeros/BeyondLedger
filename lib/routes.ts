import {IconType} from "react-icons";
import {
  LuChartBar,
  LuPiggyBank,
  LuSettings2,
  LuTrendingDown,
  LuTrendingUp,
} from "react-icons/lu";

// `key` indexes into the `nav` message namespace (locales/*.json) — labels are translated at
// render time in Sidebar/Topbar, so this config stays locale-agnostic.
export type Route = {
  key: "dashboard" | "income" | "expense" | "budget" | "settings";
  basePath: string;
  href: string;
  icon: IconType;
};

export const routes: Route[] = [
  {key: "dashboard", basePath: "/dashboard", href: "/dashboard", icon: LuChartBar},
  {key: "income", basePath: "/income", href: "/income/fixed", icon: LuTrendingUp},
  {key: "expense", basePath: "/expense", href: "/expense/fixed", icon: LuTrendingDown},
  {key: "budget", basePath: "/budget", href: "/budget", icon: LuPiggyBank},
  {key: "settings", basePath: "/settings", href: "/settings", icon: LuSettings2},
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
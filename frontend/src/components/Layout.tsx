import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../state/auth";
import { useTheme } from "../state/theme";
import { HomeIcon, LogoutIcon, MoonIcon, PlusIcon, ShirtIcon, SunIcon } from "./icons";

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
      : "text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

const tab = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"
  }`;

export const ThemeButton = () => {
  const { dark, toggle } = useTheme();
  return (
    <button className="btn-ghost size-10 !p-0" onClick={toggle} aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};

export function Layout(): ReactNode {
  const { status, logout } = useAuth();
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <NavLink to="/" className="mr-4 text-lg font-bold tracking-tight">
            It's Me
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            <NavLink to="/" end className={link}>
              Inicio
            </NavLink>
            <NavLink to="/talles" className={link}>
              Mis talles
            </NavLink>
            <NavLink to="/atributos/nuevo" className={link}>
              Nuevo atributo
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-2 hidden text-sm text-slate-500 md:inline">{status?.username}</span>
            <ThemeButton />
            <button className="btn-ghost hidden md:inline-flex" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-950"
        aria-label="Principal"
      >
        <NavLink to="/" end className={tab}>
          <HomeIcon />
          Inicio
        </NavLink>
        <NavLink to="/talles" className={tab}>
          <ShirtIcon />
          Talles
        </NavLink>
        <NavLink to="/atributos/nuevo" className={tab}>
          <PlusIcon />
          Nuevo
        </NavLink>
        <button className={tab({ isActive: false })} onClick={logout}>
          <LogoutIcon />
          Salir
        </button>
      </nav>
    </div>
  );
}

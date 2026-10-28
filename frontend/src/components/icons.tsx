import type { ReactNode, SVGProps } from "react";

const Icon = ({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    {children}
  </svg>
);

export const HomeIcon = () => <Icon><path d="M3 11l9-8 9 8M5 10v10h14V10" /></Icon>;
export const ShirtIcon = () => <Icon><path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z" /></Icon>;
export const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>;
export const LogoutIcon = () => <Icon><path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" /></Icon>;
export const SunIcon = () => <Icon><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>;
export const MoonIcon = () => <Icon><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></Icon>;
export const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>;
export const CloseIcon = () => <Icon><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const PencilIcon = () => <Icon width="16" height="16"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></Icon>;
export const TrashIcon = () => <Icon width="16" height="16"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Icon>;
export const ChevronLeftIcon = () => <Icon width="18" height="18"><path d="M15 5l-7 7 7 7" /></Icon>;
export const ChevronRightIcon = () => <Icon width="18" height="18"><path d="M9 5l7 7-7 7" /></Icon>;

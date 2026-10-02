import type { ReactNode } from 'react';
import { BellRing, ShieldCheck } from 'lucide-react';
import type { User } from '@/api';
import type { View } from '@/use-view';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { UserPicker } from '@/components/user-picker';

// Our own small layout, built from the template's sidebar, header and main pieces.
// It replaces the template's authenticated-layout, app-sidebar and nav-group, which
// depend on TanStack Router, cookies, Clerk and search providers (D-033).
const nav: { view: View; label: string; href: string; icon: typeof BellRing }[] = [
  { view: 'user', label: 'My alerts', href: '#/', icon: BellRing },
  { view: 'admin', label: 'Admin', href: '#/admin', icon: ShieldCheck },
];

type Props = {
  view: View;
  users: User[];
  user: User | null;
  onPickUser: (id: number) => void;
  children: ReactNode;
};

export function AppLayout({ view, users, user, onPickUser, children }: Props) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader>
          <div className="px-2 py-1 text-lg font-semibold group-data-[collapsible=icon]:hidden">Sonrisa</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Views</SidebarGroupLabel>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton asChild isActive={view === item.view} tooltip={item.label}>
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          <div className="px-2 text-xs text-muted-foreground">Viewing as (no login, local demo)</div>
          <UserPicker users={users} user={user} onPick={onPickUser} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header fixed>
          <span className="font-medium">{nav.find((n) => n.view === view)?.label}</span>
        </Header>
        <Main>{children}</Main>
      </SidebarInset>
    </SidebarProvider>
  );
}

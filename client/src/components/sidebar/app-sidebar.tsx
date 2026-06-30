'use client';

import * as React from 'react';
import {
  BookOpen,
  Bot,
  CircleQuestionMark,
  Send,
  SquareTerminal,
  ChartSpline,
  LayoutGrid,
  Settings
} from 'lucide-react';

// import { NavMain } from './nav-main';
import { NavProjects } from './nav-projects';
import { NavSecondary } from './nav-secondary';
import { NavUser } from './nav-user';
import type { User } from '@/api/types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';


import CreateRoomButton from '../buttons/create-room-button';

const data = {
  user: {
    name: 'user',
    email: 'john@doe.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: 'Playground',
      url: '#',
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: 'History',
          url: '#',
        },
        {
          title: 'Starred',
          url: '#',
        },
        {
          title: 'Settings',
          url: '#',
        },
      ],
    },
    {
      title: 'Models',
      url: '#',
      icon: Bot,
      items: [
        {
          title: 'Genesis',
          url: '#',
        },
        {
          title: 'Explorer',
          url: '#',
        },
        {
          title: 'Quantum',
          url: '#',
        },
      ],
    },
    {
      title: 'Documentation',
      url: '#',
      icon: BookOpen,
      items: [
        {
          title: 'Introduction',
          url: '#',
        },
        {
          title: 'Get Started',
          url: '#',
        },
        {
          title: 'Tutorials',
          url: '#',
        },
        {
          title: 'Changelog',
          url: '#',
        },
      ],
    },
    // {
    //   title: 'Settings',
    //   url: '#',
    //   icon: Settings2,
    //   items: [
    //     {
    //       title: 'General',
    //       url: '#',
    //     },
    //     {
    //       title: 'Team',
    //       url: '#',
    //     },
    //     {
    //       title: 'Billing',
    //       url: '#',
    //     },
    //     {
    //       title: 'Limits',
    //       url: '#',
    //     },
    //   ],
    // },
  ],
  navSecondary: [
    {
      title: 'Support',
      url: "mailto:hi@jsmalls.net?subject=Sway%20-%20I'm%20Having%20an%20Issue",
      icon: CircleQuestionMark,
    },
    {
      title: 'Feedback',
      url: 'https://www.github.com/jordansmalls/sway',
      icon: Send,
    },
  ],
  projects: [
    {
      name: 'Dashboard',
      url: '/dashboard',
      icon: ChartSpline,
    },
    {
      name: 'Past Rooms',
      url: '/past-rooms',
      icon: LayoutGrid,
    },
    {
      name: 'Settings',
      url: '/settings',
      icon: Settings,
    },
  ],
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: User | null;
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 42 42"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0_47_23)">
                      <path
                        d="M20.7724 21.7681V21.2276H20.2319H6.17781V20.2095C13.0744 18.5019 18.5019 13.0744 20.2095 6.17781H21.2276V20.2319V20.7724H21.7681H35.8222V21.7905C28.9256 23.4981 23.4981 28.9256 21.7905 35.8222H20.7724V21.7681ZM1.54054 15.5946H1V16.1351V25.8649V26.4054H1.54054H15.5946V40.4595V41H16.1351H25.8649H26.4054V40.4595C26.4054 32.6977 32.6977 26.4054 40.4595 26.4054H41V25.8649V16.1351V15.5946H40.4595H26.4054V1.54054V1H25.8649H16.1351H15.5946V1.54054C15.5946 9.30232 9.30232 15.5946 1.54054 15.5946Z"
                        fill="white"
                        stroke="white"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_47_23">
                        <rect width="42" height="42" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-black tracking-tighter">
                    Sway
                  </span>
                  <span className="truncate text-[.6rem] tracking-tighter opacity-70">
                    Basic Plan
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* <NavMain items={data.navMain} /> */}

        <CreateRoomButton />

        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user ?? data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}

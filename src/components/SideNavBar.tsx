// The desktop icon-rail sidebar has been retired in favor of TopNavBar's flat
// top bar (see the "Human Resource Management System" wireframe). This file
// now exists solely as the shared source of the `NavTabId` union so existing
// imports (`import { NavTabId } from './SideNavBar'`) keep working.
export type NavTabId =
  | 'dashboard'
  | 'directory'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'settings'
  | 'profile'
  | 'employees'
  | 'org';

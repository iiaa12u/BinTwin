export type PermissionSet = {
  view: boolean;
  edit: boolean;
  manage: boolean;
};

export type RoleModule =
  | "Dashboard"
  | "Bins"
  | "Routes"
  | "Scenarios"
  | "Reports"
  | "Admin Panel"
  | "System Settings";

export type RoleRecord = {
  key: "ADMINISTRATOR" | "OPERATIONS_PLANNER" | "TRUCK_DRIVER";
  name: string;
  description: string;
  status: "Active" | "Inactive";
  permissions: Record<RoleModule, PermissionSet>;
};

export const roleModules: RoleModule[] = [
  "Dashboard",
  "Bins",
  "Routes",
  "Scenarios",
  "Reports",
  "Admin Panel",
  "System Settings",
];

export const mockRoles: RoleRecord[] = [
  {
    key: "ADMINISTRATOR",
    name: "Administrator",
    description: "Full system access and platform administration.",
    status: "Active",
    permissions: {
      Dashboard: { view: true, edit: true, manage: true },
      Bins: { view: true, edit: true, manage: true },
      Routes: { view: true, edit: true, manage: true },
      Scenarios: { view: true, edit: true, manage: true },
      Reports: { view: true, edit: true, manage: true },
      "Admin Panel": { view: true, edit: true, manage: true },
      "System Settings": { view: true, edit: true, manage: true },
    },
  },
  {
    key: "OPERATIONS_PLANNER",
    name: "Operations Planner",
    description: "Manages routes, bins, scenarios, and reports.",
    status: "Active",
    permissions: {
      Dashboard: { view: true, edit: true, manage: false },
      Bins: { view: true, edit: true, manage: false },
      Routes: { view: true, edit: true, manage: true },
      Scenarios: { view: true, edit: true, manage: true },
      Reports: { view: true, edit: true, manage: false },
      "Admin Panel": { view: false, edit: false, manage: false },
      "System Settings": { view: false, edit: false, manage: false },
    },
  },
  {
    key: "TRUCK_DRIVER",
    name: "Truck Driver",
    description: "Mobile access for assigned route execution only.",
    status: "Active",
    permissions: {
      Dashboard: { view: false, edit: false, manage: false },
      Bins: { view: true, edit: false, manage: false },
      Routes: { view: true, edit: false, manage: false },
      Scenarios: { view: false, edit: false, manage: false },
      Reports: { view: false, edit: false, manage: false },
      "Admin Panel": { view: false, edit: false, manage: false },
      "System Settings": { view: false, edit: false, manage: false },
    },
  },
];
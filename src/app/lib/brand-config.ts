import fs from "fs";
import path from "path";
import {
  LockClosedIcon,
  LockOpen1Icon,
  PersonIcon,
  GlobeIcon,
  GearIcon,
  Link1Icon,
  ActivityLogIcon,
  RocketIcon,
  MixIcon,
  LayersIcon,
  BarChartIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";

// --- Types ---

export interface FeatureCard {
  title: string;
  description: string;
  icon: string;
}

export interface TrustStat {
  value: string;
  label: string;
}

export interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: string;
}

export interface BrandConfig {
  company: {
    name: string;
    tagline: string;
    description: string;
  };
  hero: {
    heading: string;
    subheading: string;
    ctaText: string;
  };
  features: FeatureCard[];
  trust: {
    heading: string;
    stats: TrustStat[];
  };
  dashboard: {
    welcomeHeading: string;
    welcomeSubheading: string;
    statusItems: {
      label: string;
      value: string;
      icon: string;
    }[];
  };
  quickActions: QuickAction[];
}

// --- Icon Mapper ---

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  LockClosedIcon,
  LockOpen1Icon,
  PersonIcon,
  GlobeIcon,
  GearIcon,
  Link1Icon,
  ActivityLogIcon,
  RocketIcon,
  MixIcon,
  LayersIcon,
  BarChartIcon,
  CheckCircledIcon,
};

export function getIcon(name: string): React.ComponentType<any> {
  return ICON_MAP[name] || GlobeIcon;
}

// --- Default Config ---

const DEFAULT_CONFIG: BrandConfig = {
  company: {
    name: "AuthKit Demo",
    tagline: "Enterprise authentication made simple",
    description:
      "A demonstration of WorkOS AuthKit's enterprise-ready authentication features.",
  },
  hero: {
    heading: "Secure access for your team",
    subheading:
      "Enterprise-grade authentication with SSO, SCIM, MFA, and more — powered by WorkOS AuthKit.",
    ctaText: "Sign In",
  },
  features: [
    {
      title: "Single Sign-On",
      description:
        "Connect your identity provider for seamless, secure access across all your tools.",
      icon: "LockClosedIcon",
    },
    {
      title: "Directory Sync",
      description:
        "Automatically provision and deprovision users from your HR system or identity provider.",
      icon: "PersonIcon",
    },
    {
      title: "Multi-Factor Auth",
      description:
        "Add an extra layer of security with TOTP, SMS, or hardware key verification.",
      icon: "LockOpen1Icon",
    },
    {
      title: "Audit Logs",
      description:
        "Track every authentication event with detailed, exportable audit trails.",
      icon: "ActivityLogIcon",
    },
  ],
  trust: {
    heading: "Enterprise-grade security and compliance",
    stats: [
      { value: "SOC 2", label: "Type II Certified" },
      { value: "99.99%", label: "Uptime SLA" },
      { value: "GDPR", label: "Compliant" },
      { value: "10K+", label: "Companies Trust Us" },
    ],
  },
  dashboard: {
    welcomeHeading: "Welcome back, {{firstName}}",
    welcomeSubheading: "Manage your {{companyName}} workspace",
    statusItems: [
      { label: "Authentication", icon: "LockClosedIcon", value: "Active" },
      { label: "Team Members", icon: "PersonIcon", value: "Synced" },
      { label: "Integrations", icon: "Link1Icon", value: "Connected" },
    ],
  },
  quickActions: [
    {
      title: "Settings",
      description: "Manage your profile, security, and team settings.",
      href: "/user-settings",
      icon: "GearIcon",
    },
    {
      title: "Integrations",
      description: "Connect your tools and manage data pipelines.",
      href: "/integrations",
      icon: "Link1Icon",
    },
    {
      title: "Logs",
      description: "View authentication logs and decoded tokens.",
      href: "/logs",
      icon: "ActivityLogIcon",
    },
  ],
};

// --- Config Reader ---

export function getBrandConfig(): BrandConfig {
  try {
    const configPath = path.join(process.cwd(), "brand-config.json");
    const raw = fs.readFileSync(configPath, "utf-8");
    const userConfig = JSON.parse(raw);
    return deepMerge(DEFAULT_CONFIG, userConfig);
  } catch {
    return DEFAULT_CONFIG;
  }
}

function deepMerge<T extends Record<string, any>>(
  defaults: T,
  overrides: Partial<T>,
): T {
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const val = overrides[key];
    if (val !== undefined && val !== null) {
      if (Array.isArray(val)) {
        (result as any)[key] = val;
      } else if (
        typeof val === "object" &&
        !Array.isArray(val) &&
        typeof defaults[key] === "object"
      ) {
        (result as any)[key] = deepMerge(defaults[key] as any, val as any);
      } else {
        (result as any)[key] = val;
      }
    }
  }
  return result;
}

export interface NavItem {
  href: string;
  label: string;
}

export interface SiteConfig {
  title: string;
  description: string;
  indexDocument: string;
  errorDocument: string;
  nav: NavItem[];
}

export interface BuiltPage {
  title: string;
  url: string;
  outputFile: string;
}

export interface DeployConfig {
  region: string;
  bucket: string;
  createBucket: boolean;
  publicWebsite: boolean;
  deleteRemoved: boolean;
  indexDocument: string;
  errorDocument: string;
}

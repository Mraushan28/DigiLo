export interface Project {
  title: string;
  category: string;
  year: string;
  media: string;
  mediaType: "video" | "image";
  description: string;
  link?: string;
}

export const portfolioProjects: Project[] = [
  {
    title: "LEAD MANAGEMENT AUTOMATION",
    category: "AI AUTOMATION",
    year: "2026",
    media: "/projects/project-01.jpg",
    mediaType: "image",
    description: "Problem: Leads were manually reviewed and entered into the CRM.\nAutomation: AI qualification + CRM integration + automated follow-up.\nResult: Reduced manual processing by 85%.",
    link: "#",
  },
  {
    title: "CUSTOMER SUPPORT WORKFLOW",
    category: "AI AUTOMATION",
    year: "2026",
    media: "/projects/project-02.jpg",
    mediaType: "image",
    description: "Problem: High volume of repetitive L1 support tickets.\nAutomation: AI agent routing + automated resolution for common queries.\nResult: 60% faster resolution times.",
    link: "#",
  },
  {
    title: "SAAS ADMIN PLATFORM",
    category: "WEB DEVELOPMENT",
    year: "2025",
    media: "/projects/project-03.jpg",
    mediaType: "image",
    description: "A custom React/Next.js dashboard for internal data management and user role administration.",
    link: "#",
  },
  {
    title: "CROSS-PLATFORM MVP",
    category: "APP DEVELOPMENT",
    year: "2025",
    media: "/projects/project-04.jpg",
    mediaType: "image",
    description: "A mobile application built in React Native connecting field workers with the central database.",
    link: "#",
  }
];

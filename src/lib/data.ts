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
    title: "E-COMMERCE PLATFORM",
    category: "Web Development",
    year: "2025",
    media: "/projects/project-01.jpg",
    mediaType: "image",
    description: "A high-performance headless e-commerce experience built for global scale.",
    link: "#",
  },
  {
    title: "BRAND IDENTITY",
    category: "Graphic Design",
    year: "2025",
    media: "/projects/project-02.jpg",
    mediaType: "image",
    description: "A complete visual identity overhaul focusing on premium digital touchpoints.",
    link: "#",
  },
  {
    title: "CAMPAIGN VISUALS",
    category: "Graphic Design",
    year: "2026",
    media: "/projects/project-03.jpg",
    mediaType: "image",
    description: "High-contrast digital campaign assets for a national product launch.",
    link: "#",
  },
  {
    title: "VIDEO CAMPAIGN",
    category: "Video Editing",
    year: "2026",
    media: "/projects/project-04.jpg",
    mediaType: "image",
    description: "Cinematic motion editing and color grading for commercial broadcast.",
    link: "#",
  }
];

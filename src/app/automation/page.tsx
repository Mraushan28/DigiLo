import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import AutomationHero from "@/components/automation/AutomationHero";
import AutomationSteps from "@/components/automation/AutomationSteps";
import AutomationExamples from "@/components/automation/AutomationExamples";
import IntegrationGrid from "@/components/automation/IntegrationGrid";
import WorkflowBuilderPreview from "@/components/automation/WorkflowBuilderPreview";
import SafetySection from "@/components/automation/SafetySection";
import ImpactMetrics from "@/components/automation/ImpactMetrics";
import AutomationCTA from "@/components/automation/AutomationCTA";

export const metadata = {
  title: "Digilo AI Automation — Tell Us What You Do. We'll Find What to Automate.",
  description: "Describe how your business works in plain language. DIGILO analyzes the process, identifies repetitive tasks, and turns them into intelligent automations.",
};

export default function AutomationPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">
        <AutomationHero />
        <AutomationSteps />
        <AutomationExamples />
        <IntegrationGrid />
        <WorkflowBuilderPreview />
        <SafetySection />
        <ImpactMetrics />
        <AutomationCTA />
      </main>
      <Footer />
    </>
  );
}

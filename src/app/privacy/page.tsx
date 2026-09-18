export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-6 py-24 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8 uppercase tracking-tight">Privacy Policy</h1>
      <div className="prose prose-invert prose-p:text-foreground/80">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <p>This Privacy Policy describes how Digilo collects, uses, and protects your personal information when you use our website and services.</p>
        {/* Placeholder for actual privacy policy content */}
        <h2>Information We Collect</h2>
        <p>We only collect information necessary to provide our digital agency services, including contact information submitted through our forms.</p>
      </div>
    </div>
  );
}

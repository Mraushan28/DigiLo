export default function TermsPage() {
  return (
    <div className="container mx-auto px-6 py-24 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8 uppercase tracking-tight">Terms of Service</h1>
      <div className="prose prose-invert prose-p:text-foreground/80">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <p>These Terms of Service govern your use of the Digilo website and the digital agency services we provide.</p>
        {/* Placeholder for actual terms content */}
        <h2>Services</h2>
        <p>Digilo provides graphic design, video editing, web development, and bulk project contracts as described on this website.</p>
      </div>
    </div>
  );
}

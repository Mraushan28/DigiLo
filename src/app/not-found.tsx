import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 uppercase">
        404
      </h1>
      <p className="text-xl text-foreground/80 mb-8 max-w-md">
        Looks like this page went off-script.
      </p>
      <Link 
        href="/"
        className="inline-flex items-center justify-center px-6 py-3 border border-foreground/20 hover:border-accent hover:text-accent transition-colors duration-200 uppercase tracking-widest text-sm font-medium"
      >
        Back to Digilo &rarr;
      </Link>
    </div>
  );
}

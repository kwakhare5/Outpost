export default function Home() {
  return (
    <main className="min-h-screen bg-background text-text-primary p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-normal tracking-tight text-text-primary">
              Outpost
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-subtle border border-border text-xs font-mono text-text-secondary">
              CONTROL ROOM
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1 font-sans">
            Mumbai Dark Stores: Andheri West • Bandra • Powai
          </p>
        </div>
      </header>
    </main>
  );
}

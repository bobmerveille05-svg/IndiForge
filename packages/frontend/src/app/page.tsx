import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">IndiForge</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/editor" className="text-muted-foreground hover:text-foreground transition-colors">
              Editor
            </Link>
            <Link href="/library" className="text-muted-foreground hover:text-foreground transition-colors">
              Library
            </Link>
            <Link href="/templates" className="text-muted-foreground hover:text-foreground transition-colors">
              Templates
            </Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link 
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/signup"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-8">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Build Trading Indicators <br className="hidden sm:inline" />
                <span className="text-primary">Without Writing Code</span>
              </h1>
              <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl">
                Design custom indicators visually, preview in real-time, and export clean code 
                to TradingView, MetaTrader, and more.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/editor/new"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8"
                >
                  Start Building — Free
                </Link>
                <Link 
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8"
                >
                  See Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 border-t border-border">
          <div className="container px-4">
            <h2 className="text-2xl font-bold text-center mb-12">Why IndiForge?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg border border-border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Visual Editor</h3>
                <p className="text-muted-foreground">
                  Drag and drop nodes to build your indicator logic. No syntax errors, no debugging mysteries.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg border border-border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Multi-Platform Export</h3>
                <p className="text-muted-foreground">
                  Generate clean, readable code for Pine Script v5, MQL5, and more—with the same logic.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg border border-border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Real-Time Preview</h3>
                <p className="text-muted-foreground">
                  See exactly how your indicator will look before exporting. Instant feedback, no surprises.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Platforms */}
        <section className="py-16 border-t border-border">
          <div className="container px-4">
            <h2 className="text-2xl font-bold text-center mb-4">Supported Platforms</h2>
            <p className="text-center text-muted-foreground mb-12">
              Export your indicators to the most popular trading platforms
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted">
                <span className="font-semibold">TradingView</span>
                <span className="text-sm text-muted-foreground">(Pine Script v5)</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted">
                <span className="font-semibold">MetaTrader 5</span>
                <span className="text-sm text-muted-foreground">(MQL5)</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted">
                <span className="font-semibold">MetaTrader 4</span>
                <span className="text-sm text-muted-foreground">(MQL4)</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted">
                <span className="font-semibold">NinjaTrader 8</span>
                <span className="text-sm text-muted-foreground">(C#)</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 IndiForge. Built for traders, by traders.
          </p>
          <div className="flex gap-4 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
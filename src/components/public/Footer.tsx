export function Footer() {
  return (
    <footer className="mt-16 border-t bg-background">
      <div className="container flex h-14 items-center justify-between text-sm text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} CMS</span>
        <span>Built with Next.js</span>
      </div>
    </footer>
  );
}

const Footer = () => {
  return (
    <footer className="border-t py-6">
      <div className="container mx-auto flex flex-col items-center gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Nitin Sahu</p>
        <div className="flex gap-4">
          <a href="https://github.com/flawlessnitin" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            GitHub
          </a>
          <a href="https://linkedin.com/in/flawlessnitin" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer;

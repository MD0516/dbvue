const NotFound = () => {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-7xl font-bold tracking-tight text-primary">
          404
        </h1>
        <div className="h-px w-12 bg-border" />
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Not Found
        </p>
      </div>
    </div>
  );
};

export default NotFound;
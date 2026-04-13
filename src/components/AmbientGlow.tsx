const AmbientGlow = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
    <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-accent/10 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
    <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-primary/5 blur-[80px] animate-pulse-glow" style={{ animationDelay: "3s" }} />
  </div>
);

export default AmbientGlow;

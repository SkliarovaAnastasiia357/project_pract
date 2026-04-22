type LoadingBlockProps = {
  label?: string;
  compact?: boolean;
};

export function LoadingBlock({ label = "Загрузка данных…", compact = false }: LoadingBlockProps) {
  return (
    <div className={`loading-block ${compact ? "loading-block--compact" : ""}`} role="status">
      <span className="loading-block__dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

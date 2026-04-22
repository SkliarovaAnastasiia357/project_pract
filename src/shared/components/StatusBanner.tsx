type StatusBannerProps = {
  tone?: "success" | "error" | "info";
  title?: string;
  message: string;
};

export function StatusBanner({ tone = "info", title, message }: StatusBannerProps) {
  return (
    <div className={`status-banner status-banner--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {title ? <p className="status-banner__title">{title}</p> : null}
      <p className="status-banner__message">{message}</p>
    </div>
  );
}

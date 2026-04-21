type VkReposLoadErrorBannerProps = {
  message: string;
  onReloadPage: () => void;
};

export function VkReposLoadErrorBanner({
  message,
  onReloadPage,
}: VkReposLoadErrorBannerProps) {
  return (
    <section className="card">
      <p className="text-danger">
        Could not load Kanban repositories: {message}
      </p>
      <button type="button" className="btn ghost" onClick={onReloadPage}>
        Reload page
      </button>
    </section>
  );
}

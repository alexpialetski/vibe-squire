import { VibeKanbanRepoPicker } from '../molecules/VibeKanbanRepoPicker';

type VkRepoOption = { id: string; name?: string };

type NewMappingCardProps = {
  githubRepo: string;
  vkRepoId: string;
  vkRepos: VkRepoOption[];
  vkReposLoading: boolean;
  upserting: boolean;
  onGithubRepoChange: (v: string) => void;
  onVkRepoIdChange: (v: string) => void;
  onSubmit: () => void;
};

export function NewMappingCard({
  githubRepo,
  vkRepoId,
  vkRepos,
  vkReposLoading,
  upserting,
  onGithubRepoChange,
  onVkRepoIdChange,
  onSubmit,
}: NewMappingCardProps) {
  return (
    <section className="card">
      <h2>New mapping</h2>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className="field">
          <span className="field-label">GitHub repo</span>
          <input
            className="input"
            value={githubRepo}
            onChange={(e) => onGithubRepoChange(e.target.value)}
            placeholder="owner/repo"
          />
        </label>
        <VibeKanbanRepoPicker
          value={vkRepoId}
          options={vkRepos}
          loading={vkReposLoading}
          onChange={onVkRepoIdChange}
        />
        <button type="submit" className="btn primary" disabled={upserting}>
          {upserting ? 'Adding…' : 'Add mapping'}
        </button>
      </form>
    </section>
  );
}

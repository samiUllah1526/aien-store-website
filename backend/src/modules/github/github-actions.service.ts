import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GITHUB_API = 'https://api.github.com';

function parseRepo(full: string): { owner: string; repo: string } {
  const trimmed = full.trim();
  const parts = trimmed.split('/').filter((p) => p.length > 0);
  if (parts.length !== 2 || parts[0].includes(' ') || parts[1].includes(' ')) {
    throw new BadRequestException(
      'GITHUB_REPO must be owner/repo (e.g. my-org/my-repo).',
    );
  }
  return { owner: parts[0], repo: parts[1] };
}

const githubApiHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

export type MainWebsiteDeployStatusRun = {
  htmlUrl: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class GithubActionsService {
  private readonly logger = new Logger(GithubActionsService.name);

  constructor(private readonly config: ConfigService) {}

  private getMainWebsiteGithubContext(): {
    token: string;
    owner: string;
    repo: string;
    workflowFile: string;
    actionsUrl: string;
  } {
    const token = this.config.get<string>('githubDeploy.token')?.trim();
    const repoFull = this.config.get<string>('githubDeploy.repo')?.trim();
    const workflowFile =
      this.config.get<string>('githubDeploy.workflowFile')?.trim() ||
      'deploy-main-website-cloudflare.yml';

    if (!token) {
      throw new ServiceUnavailableException(
        'Main website deploy is not configured: set GITHUB_DEPLOY_TOKEN on the API server.',
      );
    }
    if (!repoFull) {
      throw new ServiceUnavailableException(
        'Main website deploy is not configured: set GITHUB_REPO (owner/repo) on the API server.',
      );
    }

    const { owner, repo } = parseRepo(repoFull);
    const actionsUrl = `https://github.com/${owner}/${repo}/actions`;
    return { token, owner, repo, workflowFile, actionsUrl };
  }

  /**
   * Latest workflow run for the main-website deploy on branch `main` (GitHub Actions API).
   */
  async getMainWebsiteWorkflowLatestRun(): Promise<{
    actionsUrl: string;
    run: MainWebsiteDeployStatusRun | null;
  }> {
    const { token, owner, repo, workflowFile, actionsUrl } =
      this.getMainWebsiteGithubContext();

    const url = `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFile)}/runs?per_page=1&branch=main`;

    const res = await fetch(url, { headers: githubApiHeaders(token) });

    if (res.status === 200) {
      const body = (await res.json()) as {
        workflow_runs?: Array<{
          html_url?: string;
          status?: string;
          conclusion?: string | null;
          created_at?: string;
          updated_at?: string;
        }>;
      };
      const first = body.workflow_runs?.[0];
      if (
        !first?.html_url ||
        !first.status ||
        !first.created_at ||
        !first.updated_at
      ) {
        return { actionsUrl, run: null };
      }
      return {
        actionsUrl,
        run: {
          htmlUrl: first.html_url,
          status: first.status,
          conclusion:
            first.conclusion === undefined ? null : (first.conclusion as string | null),
          createdAt: first.created_at,
          updatedAt: first.updated_at,
        },
      };
    }

    const errText = await res.text();
    let message = `GitHub returned ${res.status}`;
    try {
      const parsed = JSON.parse(errText) as { message?: string };
      if (parsed.message) message = `${message}: ${parsed.message}`;
    } catch {
      if (errText) message = `${message}: ${errText.slice(0, 200)}`;
    }

    this.logger.warn(`list workflow runs failed: ${message}`);

    if (res.status === 401 || res.status === 403) {
      throw new BadRequestException(
        'GitHub rejected the deploy token. Check GITHUB_DEPLOY_TOKEN permissions (Actions: Read and write).',
      );
    }
    if (res.status === 404) {
      throw new BadRequestException(
        'Workflow or repository not found. Check GITHUB_REPO and GITHUB_MAIN_WEBSITE_WORKFLOW.',
      );
    }

    throw new ServiceUnavailableException(
      'Could not load workflow status from GitHub. Try again later.',
    );
  }

  /**
   * Dispatches the main-website Cloudflare deploy workflow on the default branch (main).
   */
  async dispatchMainWebsiteWorkflow(
    reason?: string,
  ): Promise<{ actionsUrl: string }> {
    const { token, owner, repo, workflowFile, actionsUrl } =
      this.getMainWebsiteGithubContext();
    const url = `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`;

    const body = {
      ref: 'main',
      inputs: {
        environment: 'production',
        purge_cache: 'true',
        skip_build: 'false',
        reason: (reason?.trim() || 'Admin portal: rebuild main website').slice(
          0,
          500,
        ),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...githubApiHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 204) {
      return { actionsUrl };
    }

    const errText = await res.text();
    let message = `GitHub returned ${res.status}`;
    try {
      const parsed = JSON.parse(errText) as { message?: string };
      if (parsed.message) message = `${message}: ${parsed.message}`;
    } catch {
      if (errText) message = `${message}: ${errText.slice(0, 200)}`;
    }

    this.logger.warn(`workflow_dispatch failed: ${message}`);

    if (res.status === 401 || res.status === 403) {
      throw new BadRequestException(
        'GitHub rejected the deploy token. Check GITHUB_DEPLOY_TOKEN permissions (Actions: Read and write).',
      );
    }
    if (res.status === 404) {
      throw new BadRequestException(
        'Workflow or repository not found. Check GITHUB_REPO and GITHUB_MAIN_WEBSITE_WORKFLOW.',
      );
    }
    if (res.status === 422) {
      throw new BadRequestException(message);
    }

    throw new ServiceUnavailableException(
      'Could not trigger GitHub Actions. Try again or run the workflow manually in GitHub.',
    );
  }
}

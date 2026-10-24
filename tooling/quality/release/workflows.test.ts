import { existsSync, readFileSync } from 'node:fs';
import { variableNames } from '@groam/env/deployment';
import { describe, expect, test } from 'vite-plus/test';

const read = (path: string) => readFileSync(path, 'utf8');
const release = () => read('.github/workflows/release.yml');
/** One job's block in the release workflow, up to the next top-level job. */
const job = (name: string) =>
  release()
    .split(/\n  (?=[a-z0-9-]+:\n)/u)
    .find((b) => b.startsWith(`${name}:`)) ?? '';

describe('release workflows', () => {
  test('checks every pull request without introducing a separate product branch', () => {
    for (const path of ['.github/workflows/ci.yml', '.github/workflows/codeql.yml']) {
      expect(read(path)).toContain('pull_request:\n  push:\n    branches: [main]');
    }
  });

  test('releases every trusted main push after successful CI', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
    expect(workflow).toContain('needs: [test]');
    expect(workflow).toContain('uses: ./.github/workflows/release.yml');
    expect(workflow).toContain('secrets: inherit');
    expect(workflow).toContain("github.repository == 'nicksan222/groam'");
    expect(workflow).toContain("github.event_name == 'push'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
  });

  test('makes the manual release rerun the full test workflow on main', () => {
    const workflow = read('.github/workflows/release-main.yml');
    const checks = read('.github/workflows/test-reusable.yml');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('uses: ./.github/workflows/test-reusable.yml');
    expect(workflow).toContain('needs: [test]');
    expect(workflow).toContain('uses: ./.github/workflows/release.yml');
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(checks).toContain('name: Checks');
    expect(checks).not.toContain('hosting:upload');
    expect(checks).not.toContain('--component web');
  });

  test('checks both environments are ready before anything deploys', () => {
    for (const [environment, githubEnvironment, releaseSwitch] of [
      ['beta', 'beta', 'CONVEX_BETA_ENABLED'],
      ['production', 'prod', 'CONVEX_PRODUCTION_ENABLED']
    ]) {
      const block = job(`preflight-${environment}`);
      expect(block).toContain(`run: bunx just deploy preflight ${environment}`);
      expect(block).toContain(`name: ${githubEnvironment}`);
      expect(block).toContain(`vars.${releaseSwitch} == 'true'`);
      for (const name of variableNames('github'))
        expect(block).toContain(`${name}: \${{ secrets.${name} }}`);
    }
    expect(job('beta')).toContain('needs: [preflight-beta, preflight-production]');
    expect(job('beta')).toContain('!failure() && !cancelled()');
    expect(job('production')).toContain('needs: [preflight-production, beta]');
  });

  test('is a reusable workflow that CI and Release main call', () => {
    expect(release()).toContain('workflow_call:');
  });

  test.each([
    ['beta', 'beta', 'CONVEX_BETA_ENABLED', 'beta-deployment'],
    ['production', 'prod', 'CONVEX_PRODUCTION_ENABLED', 'production-deployment']
  ])(
    'the %s deploy is guarded, serialized, and publishes an immutable current main SHA',
    (environment, githubEnvironment, releaseSwitch, group) => {
      const block = job(environment);

      expect(block).toContain("github.repository == 'nicksan222/groam'");
      expect(block).toContain("github.ref == 'refs/heads/main'");
      expect(block).toContain(`vars.${releaseSwitch} == 'true'`);
      expect(block).toContain(`group: ${group}`);
      expect(block).toContain('cancel-in-progress: false');
      expect(block).toContain(`name: ${githubEnvironment}`);
      expect(block).toContain('ref: ${{ github.sha }}');
      expect(block).toContain('git ls-remote --exit-code origin refs/heads/main');
      expect(block).toContain(`run: bunx just deploy release ${environment}`);
      // The deploy key and Cloudflare token reach only the deploy step.
      expect(block.match(/CONVEX_DEPLOY_KEY/g)).toHaveLength(2);
      expect(block.match(/CLOUDFLARE_API_TOKEN/g)).toHaveLength(2);
      // Public destinations come from the committed environment settings.
      expect(block).not.toContain('vars.SITE_URL');
      expect(block).not.toContain('vars.CONVEX_URL');
    }
  );

  test('removes legacy deployment paths', () => {
    for (const path of [
      '.github/workflows/bootstrap.yml',
      '.github/workflows/deploy.yml',
      '.github/workflows/deploy-beta.yml',
      '.github/workflows/deploy-production.yml',
      '.github/workflows/release-production.yml',
      '.github/workflows/deploy-production-reusable.yml',
      '.github/workflows/deploy-site.yml',
      '.github/workflows/deploy-site-reusable.yml',
      '.github/actions/setup-convex-target/action.yml',
      '.github/actions/cleanup-convex-target/action.yml'
    ]) {
      expect(existsSync(path)).toBe(false);
    }
    for (const path of [
      '.github/workflows/ci.yml',
      '.github/workflows/release-main.yml',
      '.github/workflows/release.yml'
    ]) {
      expect(read(path)).not.toContain('CONVEX_ACCESS_TOKEN');
    }
  });
});

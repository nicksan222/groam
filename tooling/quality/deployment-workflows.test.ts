import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vite-plus/test';

const read = (path: string) => readFileSync(path, 'utf8');

describe('production deployment workflows', () => {
  test('keeps automatic deployment behind successful CI on trusted main pushes', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).toContain("branches: [main, 'saas/**']");
    expect(workflow).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
    expect(workflow).toContain('needs: [test]');
    expect(workflow).toContain('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(workflow).toContain('uses: ./.github/workflows/release-production.yml');
    expect(workflow).toContain('CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}');
    expect(workflow).toContain("github.repository == 'nicksan222/groam'");
    expect(workflow).toContain("github.event_name == 'push'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
  });

  test('makes the manual production release rerun the full test workflow', () => {
    const workflow = read('.github/workflows/deploy-production.yml');
    const checks = read('.github/workflows/test-reusable.yml');

    expect(workflow).toContain('name: 🚀 Deploy Production');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('uses: ./.github/workflows/test-reusable.yml');
    expect(workflow).toContain('needs: [test]');
    expect(workflow).toContain('uses: ./.github/workflows/release-production.yml');
    expect(workflow).toContain('CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}');
    expect(workflow).toContain("github.repository == 'nicksan222/groam'");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(checks).toContain('name: Checks');
    expect(checks).toContain('wrangler deploy --config dist/cloudflare/wrangler.json --dry-run');
    expect(checks).not.toContain('name: Test\n');
    expect(checks).toContain('wrangler dev --config dist/cloudflare/wrangler.json --local');
    expect(checks).not.toContain('hosting:upload');
    expect(checks).not.toContain('--component web');
  });

  test('isolates the production key to the mutation step and deploys an immutable main SHA', () => {
    const workflow = read('.github/workflows/release-production.yml');
    const deployKeyOccurrences = workflow.match(/CONVEX_DEPLOY_KEY/g) ?? [];

    expect(workflow).toContain(
      'workflow_call:\n    secrets:\n      CONVEX_DEPLOY_KEY:\n        required: true'
    );
    expect(workflow).toContain('name: 🚀 Release Production');
    expect(workflow).not.toContain('Reusable');
    expect(workflow).toContain("vars.CONVEX_PRODUCTION_ENABLED == 'true'");
    expect(workflow).toContain("github.repository == 'nicksan222/groam'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("github.event_name == 'push'");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain('group: production-deployment');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('environment:');
    expect(workflow).toContain('name: prod');
    expect(workflow).toMatch(
      /jobs:\n  release:[\s\S]*?    env:\n      CONVEX_URL: \$\{\{ vars\.CONVEX_URL \}\}\n      SITE_URL: \$\{\{ vars\.SITE_URL \}\}/u
    );
    expect(workflow).toContain('ref: ${{ github.sha }}');
    expect(workflow).toContain('git ls-remote --exit-code origin refs/heads/main');
    expect(workflow).toContain('run: bun run build:production');
    expect(workflow).toContain('run: bun run deploy:production');
    expect(workflow).toContain('run: bun run smoke:production');
    expect(workflow).toContain('CONVEX_URL: ${{ vars.CONVEX_URL }}');
    expect(workflow).toContain('SITE_URL: ${{ vars.SITE_URL }}');
    expect(deployKeyOccurrences).toHaveLength(3);
    expect(workflow.match(/CLOUDFLARE_API_TOKEN/g)).toHaveLength(3);
    expect(workflow).toContain('CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}');
  });

  test('removes legacy beta, bootstrap, site-only, and access-token deployment paths', () => {
    for (const path of [
      '.github/workflows/bootstrap.yml',
      '.github/workflows/deploy.yml',
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
      '.github/workflows/deploy-production.yml',
      '.github/workflows/release-production.yml'
    ]) {
      expect(read(path)).not.toContain('CONVEX_ACCESS_TOKEN');
    }
  });
});

const { test, expect } = require('@playwright/test');

const topics = ['All', 'Arrays & Hashing', 'Two Pointers', 'Dynamic Programming', 'Graphs', 'Trees'];
const problems = [
  { _id: 'graph-id', title: 'Graph traversal', category: 'Graph', tags: ['BFS'], difficulty: 'Easy', acceptanceRate: 75 },
  { _id: 'tree-id', title: 'Tree traversal', category: 'Tree', tags: ['BST'], difficulty: 'Medium', acceptanceRate: 68 },
  { _id: 'dp-id', title: 'DP paths', category: 'DP', tags: ['Dynamic Programming'], difficulty: 'Medium', acceptanceRate: 62 },
  { _id: 'arrays-id', title: 'Array pairs', category: 'Arrays', tags: ['Hashing'], difficulty: 'Easy', acceptanceRate: 81 }
];

test('clicking Graphs shows only graph problems', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'playwright-student-token');
    localStorage.setItem('user', JSON.stringify({ userType: 'student' }));
  });

  await page.route('**/coding/problems**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/topics')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: topics })
      });
      return;
    }

    const topic = url.searchParams.get('topic');
    const data = topic && topic !== 'All'
      ? problems.filter(problem => problem.category.toLowerCase() === 'graph' || problem.tags.some(tag => tag.toLowerCase() === 'bfs'))
      : problems;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data })
    });
  });

  await page.goto('/dashboard/scholastic/coding');
  await expect(page.getByRole('heading', { name: 'Algorithmic Coding Arena' })).toBeVisible();
  await page.getByRole('button', { name: 'Graphs', exact: true }).click();

  await expect(page.getByRole('row').filter({ hasText: 'Graph traversal' })).toHaveCount(1);
  await expect(page.getByRole('row').filter({ hasText: 'Tree traversal' })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'DP paths' })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Array pairs' })).toHaveCount(0);
});
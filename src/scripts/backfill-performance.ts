/**
 * One-shot backfill: recompute StudentCourseStats for all enrolled students.
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/backfill-performance.ts
 * Or call POST /api/v1/analytics/backfill as SUPERADMIN.
 */
import { AnalyticsService } from '../app/modules/Analytics/analytics.service';

async function main() {
  console.log('Starting performance stats backfill…');
  const result = await AnalyticsService.backfillAllStats();
  console.log(`Done. Recomputed ${result.recomputed} student×course rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

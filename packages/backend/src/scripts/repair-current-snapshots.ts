import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { snapshotService } from "../services/snapshot.service.js";

async function main(): Promise<void> {
  const sessions = await prisma.session.findMany({
    where: { deletedAt: null, currentSnapshotId: { not: null } },
    select: { id: true, currentSnapshotId: true },
  });

  let repaired = 0;
  for (const session of sessions) {
    await prisma.$transaction(async (tx) => {
      const currentSnapshot = await tx.surfaceSnapshot.findFirst({
        where: {
          id: session.currentSnapshotId ?? undefined,
          sessionId: session.id,
          isCurrent: true,
          deletedAt: null,
        },
      });
      if (!currentSnapshot) return;

      const snapshot = await snapshotService.computeFromEvents(session.id, tx);
      const counts = snapshotService.getCounts(snapshot);
      const unchanged = JSON.stringify(currentSnapshot.snapshot) === JSON.stringify(snapshot)
        && currentSnapshot.surfaceCount === counts.surfaceCount
        && currentSnapshot.componentCount === counts.componentCount;
      if (unchanged) return;

      await tx.surfaceSnapshot.update({
        where: { id: currentSnapshot.id },
        data: {
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          surfaceCount: counts.surfaceCount,
          componentCount: counts.componentCount,
        },
      });
      repaired += 1;
    });
  }

  console.info(`当前快照校验完成：检查 ${sessions.length} 个会话，修复 ${repaired} 个会话。`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

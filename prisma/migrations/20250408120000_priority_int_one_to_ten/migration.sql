-- Priority: enum LOW/MEDIUM/HIGH -> Int 1-10 (LOW=3, MEDIUM=5, HIGH=8)

ALTER TABLE "Task" ALTER COLUMN "priority" DROP DEFAULT;

ALTER TABLE "Task" ALTER COLUMN "priority" TYPE INTEGER USING (
  CASE "priority"::text
    WHEN 'LOW' THEN 3
    WHEN 'MEDIUM' THEN 5
    WHEN 'HIGH' THEN 8
    ELSE 5
  END
);

ALTER TABLE "Task" ALTER COLUMN "priority" SET DEFAULT 5;

ALTER TABLE "Task" ADD CONSTRAINT "Task_priority_range" CHECK ("priority" >= 1 AND "priority" <= 10);

DROP TYPE "Priority";

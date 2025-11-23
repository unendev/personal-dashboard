-- Add the column to the timer_tasks table
ALTER TABLE "timer_tasks" ADD COLUMN "taskDefinitionId" TEXT;

-- Add the foreign key constraint
-- This links timer_tasks.taskDefinitionId to task_definitions.id
-- onDelete: SetNull ensures that if a TaskDefinition is deleted, the corresponding timerTasks' taskDefinitionId is set to NULL.
ALTER TABLE "timer_tasks" ADD CONSTRAINT "timer_tasks_taskDefinitionId_fkey" FOREIGN KEY ("taskDefinitionId") REFERENCES "task_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create an index on the new column to improve query performance for lookups.
CREATE INDEX "timer_tasks_taskDefinitionId_idx" ON "timer_tasks"("taskDefinitionId");

#!/usr/bin/env npx tsx
/**
 * Database Optimization Task Runner
 *
 * Usage:
 *   npx tsx scripts/db-task-runner.ts          # Show this week's tasks
 *   npx tsx scripts/db-task-runner.ts --all    # Show all tasks
 *   npx tsx scripts/db-task-runner.ts --done DB-001  # Mark task as done
 *   npx tsx scripts/db-task-runner.ts --run DB-001   # Run task commands
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TASKS_FILE = path.join(__dirname, 'scheduled-db-tasks.json');

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  week: number;
  scheduledDate: string;
  estimatedHours: number;
  commands?: string[];
  files?: string[];
  verification?: string;
  expectedResult?: string;
  targetMetric?: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
}

interface TaskData {
  project: string;
  generated: string;
  startDate: string;
  tasks: Task[];
  milestones: Array<{ name: string; date: string; criteria: string }>;
}

function loadTasks(): TaskData {
  const content = fs.readFileSync(TASKS_FILE, 'utf-8');
  return JSON.parse(content);
}

function saveTasks(data: TaskData): void {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2));
}

function getWeekNumber(date: Date, startDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = date.getTime() - startDate.getTime();
  return Math.floor(diff / msPerWeek) + 1;
}

function formatTask(task: Task): string {
  const statusEmoji = {
    pending: '⏳',
    in_progress: '🔄',
    done: '✅',
    blocked: '🚫'
  };

  const priorityColor = {
    high: '\x1b[31m',    // Red
    medium: '\x1b[33m',  // Yellow
    low: '\x1b[32m'      // Green
  };

  const reset = '\x1b[0m';

  return `
${statusEmoji[task.status]} ${priorityColor[task.priority]}[${task.priority.toUpperCase()}]${reset} ${task.id}: ${task.title}
   📅 ${task.scheduledDate} | ⏱️  ${task.estimatedHours}h
   📝 ${task.description}
   ${task.commands ? `\n   💻 Commands: ${task.commands.length}` : ''}
   ${task.files ? `\n   📁 Files: ${task.files.join(', ')}` : ''}
   ${task.verification ? `\n   ✓ Verify: ${task.verification.substring(0, 60)}...` : ''}
`;
}

function showTasks(week?: number): void {
  const data = loadTasks();
  const today = new Date();
  const startDate = new Date(data.startDate);
  const currentWeek = week || getWeekNumber(today, startDate);

  console.log('\n' + '='.repeat(60));
  console.log(`📊 ${data.project}`);
  console.log('='.repeat(60));

  if (week === undefined) {
    console.log(`\n📅 Current Week: ${currentWeek} (${today.toLocaleDateString()})\n`);
  }

  const filteredTasks = week === -1
    ? data.tasks
    : data.tasks.filter(t => t.week === currentWeek);

  if (filteredTasks.length === 0) {
    console.log('No tasks scheduled for this week.');
    return;
  }

  // Group by status
  const pending = filteredTasks.filter(t => t.status === 'pending');
  const inProgress = filteredTasks.filter(t => t.status === 'in_progress');
  const done = filteredTasks.filter(t => t.status === 'done');

  if (inProgress.length > 0) {
    console.log('\n🔄 IN PROGRESS:');
    inProgress.forEach(t => console.log(formatTask(t)));
  }

  if (pending.length > 0) {
    console.log('\n⏳ PENDING:');
    pending.forEach(t => console.log(formatTask(t)));
  }

  if (done.length > 0) {
    console.log('\n✅ COMPLETED:');
    done.forEach(t => console.log(formatTask(t)));
  }

  // Show milestones
  const upcomingMilestones = data.milestones.filter(m => new Date(m.date) >= today);
  if (upcomingMilestones.length > 0) {
    console.log('\n🎯 UPCOMING MILESTONES:');
    upcomingMilestones.forEach(m => {
      console.log(`   📌 ${m.name} - ${m.date}`);
      console.log(`      ${m.criteria}\n`);
    });
  }

  // Summary
  const total = filteredTasks.length;
  const completed = done.length;
  console.log('='.repeat(60));
  console.log(`Progress: ${completed}/${total} tasks (${Math.round(completed/total*100)}%)`);
  console.log('='.repeat(60) + '\n');
}

function updateTaskStatus(taskId: string, status: Task['status']): void {
  const data = loadTasks();
  const task = data.tasks.find(t => t.id === taskId);

  if (!task) {
    console.error(`❌ Task ${taskId} not found`);
    return;
  }

  task.status = status;
  saveTasks(data);
  console.log(`✅ Updated ${taskId} status to: ${status}`);
}

function runTaskCommands(taskId: string): void {
  const data = loadTasks();
  const task = data.tasks.find(t => t.id === taskId);

  if (!task) {
    console.error(`❌ Task ${taskId} not found`);
    return;
  }

  if (!task.commands || task.commands.length === 0) {
    console.log(`ℹ️  Task ${taskId} has no automated commands`);
    return;
  }

  console.log(`\n🚀 Running commands for ${taskId}: ${task.title}\n`);

  task.status = 'in_progress';
  saveTasks(data);

  for (const cmd of task.commands) {
    console.log(`💻 Executing: ${cmd}`);
    try {
      const output = execSync(cmd, { encoding: 'utf-8', stdio: 'inherit' });
    } catch (error: any) {
      console.error(`❌ Command failed: ${error.message}`);
      task.status = 'blocked';
      saveTasks(data);
      return;
    }
  }

  if (task.verification) {
    console.log(`\n✓ Verification query: ${task.verification}`);
    console.log(`  Expected: ${task.expectedResult || 'Check manually'}`);
  }

  console.log(`\n✅ Commands completed for ${taskId}`);
  console.log('   Run --done ' + taskId + ' to mark as complete\n');
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Optimization Task Runner

Usage:
  npx tsx scripts/db-task-runner.ts              Show this week's tasks
  npx tsx scripts/db-task-runner.ts --all        Show all tasks
  npx tsx scripts/db-task-runner.ts --week N     Show tasks for week N
  npx tsx scripts/db-task-runner.ts --done ID    Mark task as done
  npx tsx scripts/db-task-runner.ts --start ID   Mark task as in_progress
  npx tsx scripts/db-task-runner.ts --run ID     Run task commands
  `);
} else if (args.includes('--all')) {
  showTasks(-1);
} else if (args.includes('--week')) {
  const weekIndex = args.indexOf('--week');
  const week = parseInt(args[weekIndex + 1]);
  showTasks(week);
} else if (args.includes('--done')) {
  const taskIndex = args.indexOf('--done');
  const taskId = args[taskIndex + 1];
  updateTaskStatus(taskId, 'done');
} else if (args.includes('--start')) {
  const taskIndex = args.indexOf('--start');
  const taskId = args[taskIndex + 1];
  updateTaskStatus(taskId, 'in_progress');
} else if (args.includes('--run')) {
  const taskIndex = args.indexOf('--run');
  const taskId = args[taskIndex + 1];
  runTaskCommands(taskId);
} else {
  showTasks();
}

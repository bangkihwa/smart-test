import Airtable from 'airtable';
import { storage } from './storage';
import type { Student, Test, TestResult } from '@shared/schema';

interface AirtableConfig {
  apiKey: string;
  baseId: string;
  studentsTable: string;
  testsTable: string;
  resultsTable: string;
}

export class AirtableSync {
  private base: any;
  private config: AirtableConfig;

  constructor(config: AirtableConfig) {
    this.config = config;
    Airtable.configure({ apiKey: config.apiKey });
    this.base = Airtable.base(config.baseId);
  }

  async syncStudentsToAirtable(): Promise<number> {
    const students = await storage.getAllStudents();
    let synced = 0;

    for (const student of students) {
      try {
        await this.base(this.config.studentsTable).create({
          'Student ID': student.studentId,
          'Name': student.name,
          'Grade': student.grade,
          'Created At': student.createdAt.toISOString(),
        }, { typecast: true });
        synced++;
      } catch (error: any) {
        if (error.statusCode !== 422) {
          console.error(`Failed to sync student ${student.studentId}:`, error.message);
        }
      }
    }

    return synced;
  }

  async syncTestsToAirtable(): Promise<number> {
    const tests = await storage.getAllTests();
    let synced = 0;

    for (const test of tests) {
      try {
        await this.base(this.config.testsTable).create({
          'Test ID': test.testId,
          'Name': test.name,
          'Subject': test.subject,
          'Grade': test.grade || '',
          'Sections': JSON.stringify(test.sections),
          'Created At': test.createdAt.toISOString(),
        }, { typecast: true });
        synced++;
      } catch (error: any) {
        if (error.statusCode !== 422) {
          console.error(`Failed to sync test ${test.testId}:`, error.message);
        }
      }
    }

    return synced;
  }

  async syncResultsToAirtable(): Promise<number> {
    const results = await storage.getAllTestResults();
    let synced = 0;

    for (const result of results) {
      const student = await storage.getStudent(result.studentId);
      const test = await storage.getTest(result.testId);

      if (!student || !test) continue;

      try {
        await this.base(this.config.resultsTable).create({
          'Student ID': student.studentId,
          'Student Name': student.name,
          'Test ID': test.testId,
          'Test Name': test.name,
          'Score': result.score,
          'Answers': JSON.stringify(result.answers),
          'Section Scores': JSON.stringify(result.sectionScores),
          'Assigned Tasks': JSON.stringify(result.assignedTasks),
          'Completed At': result.completedAt.toISOString(),
        }, { typecast: true });
        synced++;
      } catch (error: any) {
        if (error.statusCode !== 422) {
          console.error(`Failed to sync result:`, error.message);
        }
      }
    }

    return synced;
  }

  async syncAllToAirtable(): Promise<{ students: number; tests: number; results: number }> {
    const students = await this.syncStudentsToAirtable();
    const tests = await this.syncTestsToAirtable();
    const results = await this.syncResultsToAirtable();

    return { students, tests, results };
  }

  async getAirtableStudents(): Promise<any[]> {
    const records: any[] = [];
    
    await this.base(this.config.studentsTable)
      .select({ maxRecords: 1000 })
      .eachPage((pageRecords: any[], fetchNextPage: () => void) => {
        records.push(...pageRecords.map((r: any) => r.fields));
        fetchNextPage();
      });

    return records;
  }

  async getAirtableTestResults(): Promise<any[]> {
    const records: any[] = [];
    
    await this.base(this.config.resultsTable)
      .select({ maxRecords: 1000 })
      .eachPage((pageRecords: any[], fetchNextPage: () => void) => {
        records.push(...pageRecords.map((r: any) => r.fields));
        fetchNextPage();
      });

    return records;
  }
}

export function createAirtableSync(apiKey: string, baseId: string): AirtableSync | null {
  if (!apiKey || !baseId) {
    return null;
  }

  return new AirtableSync({
    apiKey,
    baseId,
    studentsTable: 'Students',
    testsTable: 'Tests',
    resultsTable: 'Test Results',
  });
}

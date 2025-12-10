import { students, tests, testResults, type Student, type Test, type TestResult, type InsertStudent, type InsertTest, type InsertTestResult } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";

export interface IStorage {
  // Students
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByStudentId(studentId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;
  getAllStudents(): Promise<Student[]>;
  searchStudents(query?: string, grade?: string): Promise<Student[]>;

  // Tests
  getTest(id: string): Promise<Test | undefined>;
  getTestByTestId(testId: string): Promise<Test | undefined>;
  createTest(test: InsertTest): Promise<Test>;
  updateTest(id: string, test: Partial<InsertTest>): Promise<Test>;
  deleteTest(id: string): Promise<void>;
  getAllTests(): Promise<Test[]>;

  // Test Results
  getTestResult(id: string): Promise<TestResult | undefined>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  getTestResultsByStudent(studentId: string): Promise<TestResult[]>;
  getTestResultsByTest(testId: string): Promise<TestResult[]>;
  getAllTestResults(): Promise<TestResult[]>;
  getAllTestResultsWithRelations(): Promise<any[]>;
  getFilteredTestResults(filters: {
    studentId?: string;
    testId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TestResult[]>;
}

export class DatabaseStorage implements IStorage {
  // Students
  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.studentId, studentId));
    return student || undefined;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db
      .insert(students)
      .values([student])
      .returning();
    return newStudent;
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student> {
    const [updatedStudent] = await db
      .update(students)
      .set(student)
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students).orderBy(desc(students.createdAt));
  }

  async searchStudents(query?: string, grade?: string): Promise<Student[]> {
    let conditions = [];
    
    if (query) {
      conditions.push(
        or(
          like(students.name, `%${query}%`),
          like(students.studentId, `%${query}%`)
        )
      );
    }
    
    if (grade) {
      conditions.push(eq(students.grade, grade));
    }

    if (conditions.length === 0) {
      return await this.getAllStudents();
    }

    return await db.select().from(students).where(and(...conditions)).orderBy(desc(students.createdAt));
  }

  // Tests
  async getTest(id: string): Promise<Test | undefined> {
    const [test] = await db.select().from(tests).where(eq(tests.id, id));
    return test || undefined;
  }

  async getTestByTestId(testId: string): Promise<Test | undefined> {
    const [test] = await db.select().from(tests).where(eq(tests.testId, testId));
    return test || undefined;
  }

  async createTest(test: InsertTest): Promise<Test> {
    const [newTest] = await db
      .insert(tests)
      .values([test])
      .returning();
    return newTest;
  }

  async updateTest(id: string, test: Partial<InsertTest>): Promise<Test> {
    const [updatedTest] = await db
      .update(tests)
      .set(test)
      .where(eq(tests.id, id))
      .returning();
    return updatedTest;
  }

  async deleteTest(id: string): Promise<void> {
    await db.delete(tests).where(eq(tests.id, id));
  }

  async getAllTests(): Promise<Test[]> {
    return await db.select().from(tests).orderBy(desc(tests.createdAt));
  }

  // Test Results
  async getTestResult(id: string): Promise<TestResult | undefined> {
    const [result] = await db.select().from(testResults).where(eq(testResults.id, id));
    return result || undefined;
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const [newResult] = await db
      .insert(testResults)
      .values([result])
      .returning();
    return newResult;
  }

  async getTestResultsByStudent(studentId: string): Promise<TestResult[]> {
    return await db.select().from(testResults).where(eq(testResults.studentId, studentId)).orderBy(desc(testResults.completedAt));
  }

  async getTestResultsByTest(testId: string): Promise<TestResult[]> {
    return await db.select().from(testResults).where(eq(testResults.testId, testId)).orderBy(desc(testResults.completedAt));
  }

  async getAllTestResults(): Promise<TestResult[]> {
    return await db.select().from(testResults).orderBy(desc(testResults.completedAt));
  }

  async getAllTestResultsWithRelations(): Promise<any[]> {
    const results = await db
      .select({
        id: testResults.id,
        studentId: testResults.studentId,
        testId: testResults.testId,
        answers: testResults.answers,
        score: testResults.score,
        sectionScores: testResults.sectionScores,
        assignedTasks: testResults.assignedTasks,
        completedAt: testResults.completedAt,
        student: students,
        test: tests,
      })
      .from(testResults)
      .leftJoin(students, eq(testResults.studentId, students.id))
      .leftJoin(tests, eq(testResults.testId, tests.id))
      .orderBy(desc(testResults.completedAt));
    
    return results;
  }

  async getFilteredTestResults(filters: {
    studentId?: string;
    testId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TestResult[]> {
    let conditions = [];
    
    if (filters.studentId) {
      conditions.push(eq(testResults.studentId, filters.studentId));
    }
    
    if (filters.testId) {
      conditions.push(eq(testResults.testId, filters.testId));
    }
    
    if (filters.startDate) {
      conditions.push(gte(testResults.completedAt, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(testResults.completedAt, filters.endDate));
    }

    if (conditions.length === 0) {
      return await this.getAllTestResults();
    }

    return await db.select().from(testResults).where(and(...conditions)).orderBy(desc(testResults.completedAt));
  }
}

import { SupabaseStorage } from './supabase-storage';

// Use Supabase as main database
export const storage = new SupabaseStorage(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IStorage } from './storage';
import type { Student, Test, TestResult, InsertStudent, InsertTest, InsertTestResult } from '@shared/schema';

export class SupabaseStorage implements IStorage {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Students
  async getStudent(id: string): Promise<Student | undefined> {
    const { data, error } = await this.supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return this.mapStudent(data);
  }

  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    const { data, error } = await this.supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error || !data) return undefined;
    return this.mapStudent(data);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const { data, error } = await this.supabase
      .from('students')
      .insert({
        student_id: student.studentId,
        name: student.name,
        grade: student.grade,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create student: ${error.message}`);
    return this.mapStudent(data);
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student> {
    const updateData: any = {};
    if (student.studentId !== undefined) updateData.student_id = student.studentId;
    if (student.name !== undefined) updateData.name = student.name;
    if (student.grade !== undefined) updateData.grade = student.grade;

    const { data, error } = await this.supabase
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update student: ${error.message}`);
    return this.mapStudent(data);
  }

  async deleteStudent(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete student: ${error.message}`);
  }

  async getAllStudents(): Promise<Student[]> {
    const { data, error } = await this.supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get students: ${error.message}`);
    return (data || []).map(this.mapStudent);
  }

  async searchStudents(query?: string, grade?: string): Promise<Student[]> {
    let queryBuilder = this.supabase.from('students').select('*');

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,student_id.ilike.%${query}%`);
    }

    if (grade) {
      queryBuilder = queryBuilder.eq('grade', grade);
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to search students: ${error.message}`);
    return (data || []).map(this.mapStudent);
  }

  // Tests
  async getTest(id: string): Promise<Test | undefined> {
    const { data, error } = await this.supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return this.mapTest(data);
  }

  async getTestByTestId(testId: string): Promise<Test | undefined> {
    const { data, error } = await this.supabase
      .from('tests')
      .select('*')
      .eq('test_id', testId)
      .single();

    if (error || !data) return undefined;
    return this.mapTest(data);
  }

  async createTest(test: InsertTest): Promise<Test> {
    const { data, error } = await this.supabase
      .from('tests')
      .insert({
        test_id: test.testId,
        name: test.name,
        subject: test.subject,
        grade: test.grade || null,
        sections: test.sections,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create test: ${error.message}`);
    return this.mapTest(data);
  }

  async updateTest(id: string, test: Partial<InsertTest>): Promise<Test> {
    const updateData: any = {};
    if (test.testId !== undefined) updateData.test_id = test.testId;
    if (test.name !== undefined) updateData.name = test.name;
    if (test.subject !== undefined) updateData.subject = test.subject;
    if (test.grade !== undefined) updateData.grade = test.grade;
    if (test.sections !== undefined) updateData.sections = test.sections;

    const { data, error } = await this.supabase
      .from('tests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update test: ${error.message}`);
    return this.mapTest(data);
  }

  async deleteTest(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tests')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete test: ${error.message}`);
  }

  async getAllTests(): Promise<Test[]> {
    const { data, error } = await this.supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get tests: ${error.message}`);
    return (data || []).map(this.mapTest);
  }

  // Test Results
  async getTestResult(id: string): Promise<TestResult | undefined> {
    const { data, error } = await this.supabase
      .from('test_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return this.mapTestResult(data);
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const { data, error } = await this.supabase
      .from('test_results')
      .insert({
        student_id: result.studentId,
        test_id: result.testId,
        answers: result.answers,
        score: result.score,
        section_scores: result.sectionScores,
        assigned_tasks: result.assignedTasks,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create test result: ${error.message}`);
    return this.mapTestResult(data);
  }

  async getTestResultsByStudent(studentId: string): Promise<TestResult[]> {
    const { data, error } = await this.supabase
      .from('test_results')
      .select('*')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false });

    if (error) throw new Error(`Failed to get test results: ${error.message}`);
    return (data || []).map(this.mapTestResult);
  }

  async getTestResultsByTest(testId: string): Promise<TestResult[]> {
    const { data, error } = await this.supabase
      .from('test_results')
      .select('*')
      .eq('test_id', testId)
      .order('completed_at', { ascending: false });

    if (error) throw new Error(`Failed to get test results: ${error.message}`);
    return (data || []).map(this.mapTestResult);
  }

  async getAllTestResults(): Promise<TestResult[]> {
    const { data, error } = await this.supabase
      .from('test_results')
      .select('*')
      .order('completed_at', { ascending: false });

    if (error) throw new Error(`Failed to get test results: ${error.message}`);
    return (data || []).map(this.mapTestResult);
  }

  async getAllTestResultsWithRelations(): Promise<any[]> {
    const results = await this.getAllTestResults();
    const studentsMap = new Map<string, Student>();
    const testsMap = new Map<string, Test>();

    // Pre-fetch all students and tests
    const allStudents = await this.getAllStudents();
    const allTests = await this.getAllTests();
    
    allStudents.forEach(s => studentsMap.set(s.id, s));
    allTests.forEach(t => testsMap.set(t.id, t));

    return results.map(result => ({
      ...result,
      student: studentsMap.get(result.studentId) || null,
      test: testsMap.get(result.testId) || null,
    }));
  }

  async getFilteredTestResults(filters: {
    studentId?: string;
    testId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TestResult[]> {
    let queryBuilder = this.supabase.from('test_results').select('*');

    if (filters.studentId) {
      queryBuilder = queryBuilder.eq('student_id', filters.studentId);
    }

    if (filters.testId) {
      queryBuilder = queryBuilder.eq('test_id', filters.testId);
    }

    if (filters.startDate) {
      queryBuilder = queryBuilder.gte('completed_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      queryBuilder = queryBuilder.lte('completed_at', filters.endDate.toISOString());
    }

    const { data, error } = await queryBuilder.order('completed_at', { ascending: false });

    if (error) throw new Error(`Failed to get filtered test results: ${error.message}`);
    return (data || []).map(this.mapTestResult);
  }

  // Helper methods to map Supabase snake_case to camelCase
  private mapStudent(data: any): Student {
    return {
      id: data.id,
      studentId: data.student_id,
      name: data.name,
      grade: data.grade,
      createdAt: new Date(data.created_at),
    };
  }

  private mapTest(data: any): Test {
    return {
      id: data.id,
      testId: data.test_id,
      name: data.name,
      subject: data.subject,
      grade: data.grade,
      sections: data.sections,
      createdAt: new Date(data.created_at),
    };
  }

  private mapTestResult(data: any): TestResult {
    return {
      id: data.id,
      studentId: data.student_id,
      testId: data.test_id,
      answers: data.answers,
      score: data.score,
      sectionScores: data.section_scores,
      assignedTasks: data.assigned_tasks,
      completedAt: new Date(data.completed_at),
    };
  }
}

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
    // Get next ID
    const { data: maxIdData } = await this.supabase
      .from('students')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const nextId = (maxIdData?.id || 0) + 1;

    // subjects 배열을 쉼표로 구분된 문자열로 변환
    const subjectsStr = student.subjects && student.subjects.length > 0
      ? student.subjects.join(',')
      : null;

    const { data, error } = await this.supabase
      .from('students')
      .insert({
        id: nextId,
        student_id: student.studentId,
        student_name: student.name,
        grade: student.grade,
        phone: student.parentPhone || null,
        subjects: subjectsStr,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create student: ${error.message}`);
    return this.mapStudent(data);
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student> {
    const updateData: any = {};
    if (student.studentId !== undefined) updateData.student_id = student.studentId;
    if (student.name !== undefined) updateData.student_name = student.name;
    if (student.grade !== undefined) updateData.grade = student.grade;
    if (student.parentPhone !== undefined) updateData.phone = student.parentPhone || null;
    if (student.subjects !== undefined) {
      updateData.subjects = student.subjects && student.subjects.length > 0
        ? student.subjects.join(',')
        : null;
    }

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
      .order('id', { ascending: true });

    if (error) throw new Error(`Failed to get students: ${error.message}`);
    return (data || []).map(this.mapStudent);
  }

  async searchStudents(query?: string, grade?: string): Promise<Student[]> {
    let queryBuilder = this.supabase.from('students').select('*');

    if (query) {
      queryBuilder = queryBuilder.or(`student_name.ilike.%${query}%,student_id.ilike.%${query}%`);
    }

    if (grade) {
      queryBuilder = queryBuilder.eq('grade', grade);
    }

    const { data, error } = await queryBuilder.order('id', { ascending: true });

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
    const studentsMapByStudentId = new Map<string, Student>();
    const testsMap = new Map<string, Test>();

    // Pre-fetch all students and tests
    const allStudents = await this.getAllStudents();
    const allTests = await this.getAllTests();

    // Map students by their studentId
    allStudents.forEach(s => {
      studentsMapByStudentId.set(s.studentId, s);
    });
    allTests.forEach(t => testsMap.set(t.id, t));

    return results.map(result => ({
      ...result,
      student: studentsMapByStudentId.get(result.studentId) || null,
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
    // subjects가 쉼표로 구분된 문자열이면 배열로 변환
    let subjects: string[] | null = null;
    if (data.subjects) {
      if (typeof data.subjects === 'string') {
        subjects = data.subjects.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      } else if (Array.isArray(data.subjects)) {
        subjects = data.subjects;
      }
    }

    return {
      id: data.id?.toString() || data.id,
      studentId: data.student_id,
      name: data.student_name || data.name,
      grade: data.grade,
      parentPhone: data.phone || null,
      subjects,
      createdAt: new Date(data.created_at || Date.now()),
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
      specialNote: data.special_note || null,
      completedAt: new Date(data.completed_at),
    };
  }

  // 70점 미만이고 대처방안 미입력된 학생 조회
  async getSpecialAttentionResults(): Promise<any[]> {
    const { data: results, error } = await this.supabase
      .from('test_results')
      .select('*')
      .lt('score', 70)
      .is('special_note', null)
      .order('completed_at', { ascending: false });

    if (error) throw new Error(`Failed to get special attention results: ${error.message}`);

    const allStudents = await this.getAllStudents();
    const allTests = await this.getAllTests();

    const studentsMap = new Map<string, Student>();
    allStudents.forEach(s => studentsMap.set(s.studentId, s));

    const testsMap = new Map<string, Test>();
    allTests.forEach(t => testsMap.set(t.id, t));

    return (results || []).map((r: any) => ({
      ...this.mapTestResult(r),
      student: studentsMap.get(r.student_id) || null,
      test: testsMap.get(r.test_id) || null,
    }));
  }

  // 70점 미만 전체 이력 조회 (대처방안 입력된 것 포함)
  async getSpecialAttentionHistory(): Promise<any[]> {
    const { data: results, error } = await this.supabase
      .from('test_results')
      .select('*')
      .lt('score', 70)
      .order('completed_at', { ascending: false });

    if (error) throw new Error(`Failed to get special attention history: ${error.message}`);

    const allStudents = await this.getAllStudents();
    const allTests = await this.getAllTests();

    const studentsMap = new Map<string, Student>();
    allStudents.forEach(s => studentsMap.set(s.studentId, s));

    const testsMap = new Map<string, Test>();
    allTests.forEach(t => testsMap.set(t.id, t));

    return (results || []).map((r: any) => ({
      ...this.mapTestResult(r),
      student: studentsMap.get(r.student_id) || null,
      test: testsMap.get(r.test_id) || null,
    }));
  }

  // 대처방안 저장
  async updateSpecialNote(id: string, specialNote: string): Promise<TestResult> {
    const { data, error } = await this.supabase
      .from('test_results')
      .update({ special_note: specialNote })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update special note: ${error.message}`);
    return this.mapTestResult(data);
  }
}

import Airtable from 'airtable';
import { nanoid } from 'nanoid';
import type { IStorage } from './storage';
import type { Student, Test, TestResult, InsertStudent, InsertTest, InsertTestResult } from '@shared/schema';

export class AirtableStorage implements IStorage {
  private base: any;
  private studentsTable = 'Students';
  private testsTable = 'Tests';
  private resultsTable = 'Test Results';

  constructor(apiKey: string, baseId: string) {
    Airtable.configure({ apiKey });
    this.base = Airtable.base(baseId);
  }

  // Students
  async getStudent(id: string): Promise<Student | undefined> {
    try {
      const records = await this.base(this.studentsTable)
        .select({
          filterByFormula: `{ID} = '${id}'`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) return undefined;

      const record = records[0];
      return {
        id: record.fields['ID'] as string,
        studentId: record.fields['Student ID'] as string,
        name: record.fields['Name'] as string,
        grade: record.fields['Grade'] as string,
        createdAt: new Date(record.fields['Created At'] as string),
      };
    } catch (error) {
      console.error('Error getting student:', error);
      return undefined;
    }
  }

  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    try {
      const records = await this.base(this.studentsTable)
        .select({
          filterByFormula: `{Student ID} = '${studentId}'`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) return undefined;

      const record = records[0];
      return {
        id: record.fields['ID'] as string,
        studentId: record.fields['Student ID'] as string,
        name: record.fields['Name'] as string,
        grade: record.fields['Grade'] as string,
        createdAt: new Date(record.fields['Created At'] as string),
      };
    } catch (error) {
      console.error('Error getting student by studentId:', error);
      return undefined;
    }
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = nanoid();
    const createdAt = new Date();

    const record = await this.base(this.studentsTable).create({
      'ID': id,
      'Student ID': student.studentId,
      'Name': student.name,
      'Grade': student.grade,
      'Created At': createdAt.toISOString(),
    }, { typecast: true });

    return {
      id,
      studentId: student.studentId,
      name: student.name,
      grade: student.grade,
      createdAt,
    };
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student> {
    const records = await this.base(this.studentsTable)
      .select({
        filterByFormula: `{ID} = '${id}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      throw new Error('Student not found');
    }

    const recordId = records[0].id;
    const updateData: any = {};

    if (student.studentId) updateData['Student ID'] = student.studentId;
    if (student.name) updateData['Name'] = student.name;
    if (student.grade) updateData['Grade'] = student.grade;

    const updatedRecord = await this.base(this.studentsTable).update(recordId, updateData, { typecast: true });

    return {
      id: updatedRecord.fields['ID'] as string,
      studentId: updatedRecord.fields['Student ID'] as string,
      name: updatedRecord.fields['Name'] as string,
      grade: updatedRecord.fields['Grade'] as string,
      createdAt: new Date(updatedRecord.fields['Created At'] as string),
    };
  }

  async deleteStudent(id: string): Promise<void> {
    const records = await this.base(this.studentsTable)
      .select({
        filterByFormula: `{ID} = '${id}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length > 0) {
      await this.base(this.studentsTable).destroy(records[0].id);
    }
  }

  async getAllStudents(): Promise<Student[]> {
    const students: Student[] = [];

    await this.base(this.studentsTable)
      .select({
        sort: [{ field: 'Created At', direction: 'desc' }]
      })
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(record => {
          students.push({
            id: record.fields['ID'] as string,
            studentId: record.fields['Student ID'] as string,
            name: record.fields['Name'] as string,
            grade: record.fields['Grade'] as string,
            createdAt: new Date(record.fields['Created At'] as string),
          });
        });
        fetchNextPage();
      });

    return students;
  }

  async searchStudents(query?: string, grade?: string): Promise<Student[]> {
    const students: Student[] = [];
    let formula = '';

    if (query && grade) {
      formula = `AND(OR(FIND(LOWER('${query}'), LOWER({Name})), FIND(LOWER('${query}'), LOWER({Student ID}))), {Grade} = '${grade}')`;
    } else if (query) {
      formula = `OR(FIND(LOWER('${query}'), LOWER({Name})), FIND(LOWER('${query}'), LOWER({Student ID})))`;
    } else if (grade) {
      formula = `{Grade} = '${grade}'`;
    }

    const selectOptions: any = {
      sort: [{ field: 'Created At', direction: 'desc' }]
    };

    if (formula) {
      selectOptions.filterByFormula = formula;
    }

    await this.base(this.studentsTable)
      .select(selectOptions)
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(record => {
          students.push({
            id: record.fields['ID'] as string,
            studentId: record.fields['Student ID'] as string,
            name: record.fields['Name'] as string,
            grade: record.fields['Grade'] as string,
            createdAt: new Date(record.fields['Created At'] as string),
          });
        });
        fetchNextPage();
      });

    return students;
  }

  // Tests
  async getTest(id: string): Promise<Test | undefined> {
    try {
      const records = await this.base(this.testsTable)
        .select({
          filterByFormula: `{ID} = '${id}'`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) return undefined;

      const record = records[0];
      return {
        id: record.fields['ID'] as string,
        testId: record.fields['Test ID'] as string,
        name: record.fields['Name'] as string,
        subject: record.fields['Subject'] as string,
        grade: (record.fields['Grade'] as string) || null,
        sections: JSON.parse(record.fields['Sections'] as string) as any,
        createdAt: new Date(record.fields['Created At'] as string),
      };
    } catch (error) {
      console.error('Error getting test:', error);
      return undefined;
    }
  }

  async getTestByTestId(testId: string): Promise<Test | undefined> {
    try {
      const records = await this.base(this.testsTable)
        .select({
          filterByFormula: `{Test ID} = '${testId}'`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) return undefined;

      const record = records[0];
      return {
        id: record.fields['ID'] as string,
        testId: record.fields['Test ID'] as string,
        name: record.fields['Name'] as string,
        subject: record.fields['Subject'] as string,
        grade: (record.fields['Grade'] as string) || null,
        sections: JSON.parse(record.fields['Sections'] as string) as any,
        createdAt: new Date(record.fields['Created At'] as string),
      };
    } catch (error) {
      console.error('Error getting test by testId:', error);
      return undefined;
    }
  }

  async createTest(test: InsertTest): Promise<Test> {
    const id = nanoid();
    const createdAt = new Date();

    const fieldsWithGrade: any = {
      'ID': id,
      'Test ID': test.testId,
      'Name': test.name,
      'Subject': test.subject,
      'Grade': test.grade || '',
      'Sections': JSON.stringify(test.sections),
      'Created At': createdAt.toISOString(),
    };

    try {
      // Try to create with Grade field
      await this.base(this.testsTable).create(fieldsWithGrade, { typecast: true });
    } catch (error: any) {
      // If Grade field doesn't exist in Airtable, retry without it
      if (error.statusCode === 422 && error.error === 'UNKNOWN_FIELD_NAME') {
        console.warn('Grade field not found in Airtable Tests table, creating without it');
        const fieldsWithoutGrade: any = {
          'ID': id,
          'Test ID': test.testId,
          'Name': test.name,
          'Subject': test.subject,
          'Sections': JSON.stringify(test.sections),
          'Created At': createdAt.toISOString(),
        };
        await this.base(this.testsTable).create(fieldsWithoutGrade, { typecast: true });
      } else {
        throw error;
      }
    }

    return {
      id,
      testId: test.testId,
      name: test.name,
      subject: test.subject,
      grade: test.grade || null,
      sections: test.sections,
      createdAt,
    };
  }

  async updateTest(id: string, test: Partial<InsertTest>): Promise<Test> {
    const records = await this.base(this.testsTable)
      .select({
        filterByFormula: `{ID} = '${id}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      throw new Error('Test not found');
    }

    const recordId = records[0].id;
    const updateData: any = {};

    if (test.testId) updateData['Test ID'] = test.testId;
    if (test.name) updateData['Name'] = test.name;
    if (test.subject) updateData['Subject'] = test.subject;
    if (test.grade !== undefined) updateData['Grade'] = test.grade || '';
    if (test.sections) updateData['Sections'] = JSON.stringify(test.sections);

    let updatedRecord;
    try {
      updatedRecord = await this.base(this.testsTable).update(recordId, updateData, { typecast: true });
    } catch (error: any) {
      // If Grade field doesn't exist, retry without it
      if (error.statusCode === 422 && error.error === 'UNKNOWN_FIELD_NAME' && updateData['Grade'] !== undefined) {
        console.warn('Grade field not found in Airtable Tests table, updating without it');
        delete updateData['Grade'];
        updatedRecord = await this.base(this.testsTable).update(recordId, updateData, { typecast: true });
      } else {
        throw error;
      }
    }

    return {
      id: updatedRecord.fields['ID'] as string,
      testId: updatedRecord.fields['Test ID'] as string,
      name: updatedRecord.fields['Name'] as string,
      subject: updatedRecord.fields['Subject'] as string,
      grade: (updatedRecord.fields['Grade'] as string) || null,
      sections: JSON.parse(updatedRecord.fields['Sections'] as string),
      createdAt: new Date(updatedRecord.fields['Created At'] as string),
    };
  }

  async deleteTest(id: string): Promise<void> {
    const records = await this.base(this.testsTable)
      .select({
        filterByFormula: `{ID} = '${id}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length > 0) {
      await this.base(this.testsTable).destroy(records[0].id);
    }
  }

  async getAllTests(): Promise<Test[]> {
    const tests: Test[] = [];

    await this.base(this.testsTable)
      .select({
        sort: [{ field: 'Created At', direction: 'desc' }]
      })
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(record => {
          tests.push({
            id: record.fields['ID'] as string,
            testId: record.fields['Test ID'] as string,
            name: record.fields['Name'] as string,
            subject: record.fields['Subject'] as string,
            grade: (record.fields['Grade'] as string) || null,
            sections: JSON.parse(record.fields['Sections'] as string) as any,
            createdAt: new Date(record.fields['Created At'] as string),
          });
        });
        fetchNextPage();
      });

    return tests;
  }

  // Test Results
  async getTestResult(id: string): Promise<TestResult | undefined> {
    try {
      const records = await this.base(this.resultsTable)
        .select({
          filterByFormula: `{ID} = '${id}'`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) return undefined;

      const record = records[0];
      return {
        id: record.fields['ID'] as string,
        studentId: record.fields['Student ID Internal'] as string,
        testId: record.fields['Test ID Internal'] as string,
        answers: JSON.parse(record.fields['Answers'] as string) as number[],
        score: record.fields['Score'] as number,
        sectionScores: JSON.parse(record.fields['Section Scores'] as string) as any,
        assignedTasks: JSON.parse(record.fields['Assigned Tasks'] as string) as any,
        completedAt: new Date(record.fields['Completed At'] as string),
      };
    } catch (error) {
      console.error('Error getting test result:', error);
      return undefined;
    }
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const id = nanoid();
    const completedAt = new Date();

    // Get student and test info for display fields
    const student = await this.getStudent(result.studentId);
    const test = await this.getTest(result.testId);

    await this.base(this.resultsTable).create({
      'ID': id,
      'Student ID Internal': result.studentId,
      'Test ID Internal': result.testId,
      'Student ID': student?.studentId || '',
      'Student Name': student?.name || '',
      'Test ID': test?.testId || '',
      'Test Name': test?.name || '',
      'Answers': JSON.stringify(result.answers),
      'Score': result.score,
      'Section Scores': JSON.stringify(result.sectionScores),
      'Assigned Tasks': JSON.stringify(result.assignedTasks),
      'Completed At': completedAt.toISOString(),
    }, { typecast: true });

    return {
      id,
      studentId: result.studentId,
      testId: result.testId,
      answers: result.answers,
      score: result.score,
      sectionScores: result.sectionScores,
      assignedTasks: result.assignedTasks,
      completedAt,
    };
  }

  async getTestResultsByStudent(studentId: string): Promise<TestResult[]> {
    const results: TestResult[] = [];

    await this.base(this.resultsTable)
      .select({
        filterByFormula: `{Student ID Internal} = '${studentId}'`,
        sort: [{ field: 'Completed At', direction: 'desc' }]
      })
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(record => {
          results.push({
            id: record.fields['ID'] as string,
            studentId: record.fields['Student ID Internal'] as string,
            testId: record.fields['Test ID Internal'] as string,
            answers: JSON.parse(record.fields['Answers'] as string),
            score: record.fields['Score'] as number,
            sectionScores: JSON.parse(record.fields['Section Scores'] as string),
            assignedTasks: JSON.parse(record.fields['Assigned Tasks'] as string),
            completedAt: new Date(record.fields['Completed At'] as string),
          });
        });
        fetchNextPage();
      });

    return results;
  }

  async getTestResultsByTest(testId: string): Promise<TestResult[]> {
    const results: TestResult[] = [];

    await this.base(this.resultsTable)
      .select({
        filterByFormula: `{Test ID Internal} = '${testId}'`,
        sort: [{ field: 'Completed At', direction: 'desc' }]
      })
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(record => {
          results.push({
            id: record.fields['ID'] as string,
            studentId: record.fields['Student ID Internal'] as string,
            testId: record.fields['Test ID Internal'] as string,
            answers: JSON.parse(record.fields['Answers'] as string),
            score: record.fields['Score'] as number,
            sectionScores: JSON.parse(record.fields['Section Scores'] as string),
            assignedTasks: JSON.parse(record.fields['Assigned Tasks'] as string),
            completedAt: new Date(record.fields['Completed At'] as string),
          });
        });
        fetchNextPage();
      });

    return results;
  }

  async getAllTestResults(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    await this.base(this.resultsTable)
      .select({
        sort: [{ field: 'Completed At', direction: 'desc' }]
      })
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(record => {
          results.push({
            id: record.fields['ID'] as string,
            studentId: record.fields['Student ID Internal'] as string,
            testId: record.fields['Test ID Internal'] as string,
            answers: JSON.parse(record.fields['Answers'] as string),
            score: record.fields['Score'] as number,
            sectionScores: JSON.parse(record.fields['Section Scores'] as string),
            assignedTasks: JSON.parse(record.fields['Assigned Tasks'] as string),
            completedAt: new Date(record.fields['Completed At'] as string),
          });
        });
        fetchNextPage();
      });

    return results;
  }

  async getAllTestResultsWithRelations(): Promise<any[]> {
    const rawResults: any[] = [];

    await this.base(this.resultsTable)
      .select({
        sort: [{ field: 'Completed At', direction: 'desc' }]
      })
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(record => {
          rawResults.push({
            id: record.fields['ID'] as string,
            studentId: record.fields['Student ID Internal'] as string,
            testId: record.fields['Test ID Internal'] as string,
            answers: JSON.parse(record.fields['Answers'] as string),
            score: record.fields['Score'] as number,
            sectionScores: JSON.parse(record.fields['Section Scores'] as string),
            assignedTasks: JSON.parse(record.fields['Assigned Tasks'] as string),
            completedAt: new Date(record.fields['Completed At'] as string),
          });
        });
        fetchNextPage();
      });

    const results = await Promise.all(
      rawResults.map(async (result) => {
        const student = await this.getStudent(result.studentId);
        const test = await this.getTest(result.testId);
        
        return {
          ...result,
          student: student || { id: result.studentId, studentId: '', name: 'Unknown', grade: '' },
          test: test || { id: result.testId, testId: '', name: 'Unknown', subject: '', grade: null, sections: [] },
        };
      })
    );

    return results;
  }

  async getFilteredTestResults(filters: {
    studentId?: string;
    testId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const formulas: string[] = [];

    if (filters.studentId) {
      formulas.push(`{Student ID Internal} = '${filters.studentId}'`);
    }

    if (filters.testId) {
      formulas.push(`{Test ID Internal} = '${filters.testId}'`);
    }

    if (filters.startDate) {
      formulas.push(`IS_AFTER({Completed At}, '${filters.startDate.toISOString()}')`);
    }

    if (filters.endDate) {
      formulas.push(`IS_BEFORE({Completed At}, '${filters.endDate.toISOString()}')`);
    }

    const filterFormula = formulas.length > 0 ? `AND(${formulas.join(', ')})` : '';

    const selectOptions: any = {
      sort: [{ field: 'Completed At', direction: 'desc' }]
    };

    if (filterFormula) {
      selectOptions.filterByFormula = filterFormula;
    }

    await this.base(this.resultsTable)
      .select(selectOptions)
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(record => {
          results.push({
            id: record.fields['ID'] as string,
            studentId: record.fields['Student ID Internal'] as string,
            testId: record.fields['Test ID Internal'] as string,
            answers: JSON.parse(record.fields['Answers'] as string),
            score: record.fields['Score'] as number,
            sectionScores: JSON.parse(record.fields['Section Scores'] as string),
            assignedTasks: JSON.parse(record.fields['Assigned Tasks'] as string),
            completedAt: new Date(record.fields['Completed At'] as string),
          });
        });
        fetchNextPage();
      });

    return results;
  }
}

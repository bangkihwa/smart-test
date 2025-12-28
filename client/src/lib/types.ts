export interface Student {
  id: string;
  studentId: string;
  name: string;
  grade: string;
  parentPhone?: string | null;
  createdAt: string;
}

export interface Test {
  id: string;
  testId: string;
  name: string;
  subject: string;
  grade: GradeLevel | null;
  sections: TestSection[];
  createdAt: string;
}

export interface TestSection {
  sectionNumber: number;
  name: string;
  coreContent: string;
  answers: number[];
  assignments: {
    light: string;
    medium: string;
    heavy: string;
  };
}

export interface TestResult {
  id: string;
  studentId: string;
  testId: string;
  answers: number[];
  score: number;
  sectionScores: SectionScore[];
  assignedTasks: AssignedTask[];
  specialNote?: string | null;
  completedAt: string;
}

export interface SectionScore {
  sectionNumber: number;
  correct: number;
  total: number;
  wrongAnswers: number[];
}

export interface AssignedTask {
  sectionNumber: number;
  taskType: 'light' | 'medium' | 'heavy';
  task: string;
}

export type GradeLevel = 
  | "중등1학년" 
  | "중등2학년" 
  | "중등3학년" 
  | "고등1학년" 
  | "고등2학년" 
  | "고등3학년";

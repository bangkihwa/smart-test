import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, boolean, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: text("student_id").notNull().unique(),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  parentPhone: text("parent_phone"),
  subjects: json("subjects").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tests = pgTable("tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: text("test_id").notNull().unique(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  grade: text("grade"),
  sections: json("sections").$type<{
    sectionNumber: number;
    name: string;
    coreContent: string;
    answers: number[];
    assignments: {
      light: string;
      medium: string;
      heavy: string;
    };
  }[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testResults = pgTable("test_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => students.id),
  testId: varchar("test_id").notNull().references(() => tests.id),
  answers: json("answers").$type<number[]>().notNull(),
  score: integer("score").notNull(),
  sectionScores: json("section_scores").$type<{
    sectionNumber: number;
    correct: number;
    total: number;
    wrongAnswers: number[];
  }[]>().notNull(),
  assignedTasks: json("assigned_tasks").$type<{
    sectionNumber: number;
    taskType: 'light' | 'medium' | 'heavy';
    task: string;
  }[]>().notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const studentsRelations = relations(students, ({ many }) => ({
  testResults: many(testResults),
}));

export const testsRelations = relations(tests, ({ many }) => ({
  testResults: many(testResults),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  student: one(students, {
    fields: [testResults.studentId],
    references: [students.id],
  }),
  test: one(tests, {
    fields: [testResults.testId],
    references: [tests.id],
  }),
}));

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
  createdAt: true,
});

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  completedAt: true,
});

// SMS 설정 테이블
export const smsSettings = pgTable("sms_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // 점수별 평가 메시지
  scoreMessage90: text("score_message_90").default('훌륭합니다!'),
  scoreMessage80: text("score_message_80").default('잘했어요!'),
  scoreMessage70: text("score_message_70").default('조금만 더 노력하면 완벽해요!'),
  scoreMessage60: text("score_message_60").default('조금 더 복습이 필요해요.'),
  scoreMessageBelow: text("score_message_below").default('열심히 복습해주세요!'),
  // 파트별 피드백
  sectionFeedback90: text("section_feedback_90").default('우수'),
  sectionFeedback80: text("section_feedback_80").default('양호'),
  sectionFeedback70: text("section_feedback_70").default('보통'),
  sectionFeedback60: text("section_feedback_60").default('노력'),
  sectionFeedbackBelow: text("section_feedback_below").default('복습필요'),
  // 과제 유형명
  taskTypeLight: text("task_type_light").default('기본'),
  taskTypeMedium: text("task_type_medium").default('보충'),
  taskTypeHeavy: text("task_type_heavy").default('심화'),
  // 기본 과제 템플릿 (테스트별 과제가 없을 때 사용)
  defaultTaskLight: text("default_task_light").default('시험지에 오답문제 정리해오기'),
  defaultTaskMedium: text("default_task_medium").default('수업노트 필기 다시하고 오답문제 정리하기'),
  defaultTaskHeavy: text("default_task_heavy").default('동영상 수업 내용복습, 수업노트 필기, 오답정리해오기'),
  // 학원 정보
  academyName: text("academy_name").default('목동에이원과학학원'),
  // 수정일
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSmsSettingsSchema = createInsertSchema(smsSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof tests.$inferSelect;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResult = typeof testResults.$inferSelect;
export type InsertSmsSettings = z.infer<typeof insertSmsSettingsSchema>;
export type SmsSettings = typeof smsSettings.$inferSelect;

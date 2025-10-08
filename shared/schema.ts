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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tests = pgTable("tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: text("test_id").notNull().unique(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
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

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof tests.$inferSelect;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResult = typeof testResults.$inferSelect;

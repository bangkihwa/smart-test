import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStudentSchema, insertTestSchema, insertTestResultSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Student routes
  app.get("/api/students", async (req, res) => {
    try {
      const { search, grade } = req.query;
      const students = await storage.searchStudents(
        search as string,
        grade as string
      );
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.get("/api/students/by-student-id/:studentId", async (req, res) => {
    try {
      const student = await storage.getStudentByStudentId(req.params.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post("/api/students/login", async (req, res) => {
    try {
      // Validate input with Zod schema
      const loginSchema = z.object({
        studentId: z.string().trim().min(1, "Student ID is required"),
        name: z.string().trim().min(1, "Name is required"),
        grade: z.enum([
          "중등1학년",
          "중등2학년",
          "중등3학년",
          "고등1학년",
          "고등2학년",
          "고등3학년"
        ], { required_error: "Valid grade is required" }),
      });
      
      const validated = loginSchema.parse(req.body);
      
      // Check if student exists (must be pre-registered by admin)
      let student = await storage.getStudentByStudentId(validated.studentId);
      
      if (!student) {
        // Student not found - must be registered by admin first
        return res.status(404).json({ 
          message: "등록되지 않은 학생입니다. 관리자에게 문의하세요.",
        });
      }
      
      // Check if name matches (grade doesn't need to match)
      if (student.name !== validated.name) {
        return res.status(409).json({ 
          message: "이름이 일치하지 않습니다. 다시 확인해주세요.",
        });
      }
      
      // Return student with the selected grade for test filtering (don't update DB)
      res.json({
        ...student,
        grade: validated.grade,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input data", 
          errors: error.errors.map(e => e.message).join(", ")
        });
      }
      console.error("Error logging in student:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const studentData = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(req.params.id, studentData);
      res.json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid student data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      await storage.deleteStudent(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Test routes
  app.get("/api/tests", async (req, res) => {
    try {
      const tests = await storage.getAllTests();
      res.json(tests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tests" });
    }
  });

  app.get("/api/tests/:id", async (req, res) => {
    try {
      const test = await storage.getTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test" });
    }
  });

  app.get("/api/tests/by-test-id/:testId", async (req, res) => {
    try {
      const test = await storage.getTestByTestId(req.params.testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test" });
    }
  });

  app.post("/api/tests", async (req, res) => {
    try {
      const testData = insertTestSchema.parse(req.body);
      const test = await storage.createTest(testData);
      res.status(201).json(test);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid test data", errors: error.errors });
      }
      console.error('Error creating test:', error);
      res.status(500).json({ message: "Failed to create test" });
    }
  });

  app.put("/api/tests/:id", async (req, res) => {
    try {
      const testData = insertTestSchema.partial().parse(req.body);
      const test = await storage.updateTest(req.params.id, testData);
      res.json(test);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid test data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update test" });
    }
  });

  app.delete("/api/tests/:id", async (req, res) => {
    try {
      await storage.deleteTest(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete test" });
    }
  });

  // Test result routes
  app.get("/api/test-results", async (req, res) => {
    try {
      const { studentId, testId, startDate, endDate } = req.query;
      const filters: any = {};
      
      if (studentId) filters.studentId = studentId as string;
      if (testId) filters.testId = testId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const results = await storage.getFilteredTestResults(filters);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test results" });
    }
  });

  app.get("/api/test-results/all", async (req, res) => {
    try {
      const results = await storage.getAllTestResultsWithRelations();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test results" });
    }
  });

  app.get("/api/test-results/:id", async (req, res) => {
    try {
      const result = await storage.getTestResult(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Test result not found" });
      }

      // Get test details
      const test = await storage.getTest(result.testId);

      // Return result with test info
      res.json({
        ...result,
        test: test || null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test result" });
    }
  });

  app.post("/api/test-results", async (req, res) => {
    try {
      const resultData = insertTestResultSchema.parse(req.body);
      const result = await storage.createTestResult(resultData);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid test result data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create test result" });
    }
  });

  app.post("/api/test-results/submit", async (req, res) => {
    try {
      const { studentId, testId, answers } = req.body;
      
      // Validate student exists (should be created via login)
      const student = await storage.getStudentByStudentId(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found. Please login first." });
      }

      // Validate test exists
      const test = await storage.getTestByTestId(testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      // Calculate scores and assignments
      let totalScore = 0;
      let totalQuestions = 0;
      const sectionScores = [];
      const assignedTasks = [];

      for (const section of test.sections) {
        const sectionAnswers = answers.slice(
          (section.sectionNumber - 1) * 10,
          section.sectionNumber * 10
        );
        
        let correct = 0;
        const wrongAnswers = [];

        for (let i = 0; i < section.answers.length; i++) {
          totalQuestions++;
          if (section.answers[i] === sectionAnswers[i]) {
            correct++;
            totalScore++;
          } else {
            wrongAnswers.push((section.sectionNumber - 1) * 10 + i + 1);
          }
        }

        const wrongCount = section.answers.length - correct;
        let taskType: 'light' | 'medium' | 'heavy';
        let task: string;

        if (wrongCount <= 2) {
          taskType = 'light';
          task = section.assignments.light;
        } else if (wrongCount <= 4) {
          taskType = 'medium';
          task = section.assignments.medium;
        } else {
          taskType = 'heavy';
          task = section.assignments.heavy;
        }

        sectionScores.push({
          sectionNumber: section.sectionNumber,
          correct,
          total: section.answers.length,
          wrongAnswers,
        });

        assignedTasks.push({
          sectionNumber: section.sectionNumber,
          taskType,
          task,
        });
      }

      const finalScore = Math.round((totalScore / totalQuestions) * 100);

      const resultData = {
        studentId: student.studentId,
        testId: test.id,
        answers,
        score: finalScore,
        sectionScores,
        assignedTasks,
      };

      const result = await storage.createTestResult(resultData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error submitting test:", error);
      res.status(500).json({ message: "Failed to submit test" });
    }
  });

  app.get("/api/test-results/student/:studentId", async (req, res) => {
    try {
      const results = await storage.getTestResultsByStudent(req.params.studentId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student test results" });
    }
  });

  app.get("/api/test-results/test/:testId", async (req, res) => {
    try {
      const results = await storage.getTestResultsByTest(req.params.testId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

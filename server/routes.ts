import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStudentSchema, insertTestSchema, insertTestResultSchema, insertSmsSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { sendTestResultSMS, sendTestSMS } from "./sms-service";
import { omrProcessor, type OMRScanResult } from "./omr-service";
import multer from "multer";

// multer 설정 (메모리 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
      // Validate input with Zod schema - grade is now optional
      const loginSchema = z.object({
        studentId: z.string().trim().min(1, "Student ID is required"),
        name: z.string().trim().min(1, "Name is required"),
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

      // Check if name matches
      if (student.name !== validated.name) {
        return res.status(409).json({
          message: "이름이 일치하지 않습니다. 다시 확인해주세요.",
        });
      }

      // Return student with the grade from database
      res.json(student);
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

  // 특별 관리 대상 조회 (70점 미만, 대처방안 미입력) - :id 라우트보다 먼저 정의해야 함
  app.get("/api/test-results/special-attention", async (req, res) => {
    try {
      const results = await storage.getSpecialAttentionResults();
      res.json(results);
    } catch (error) {
      console.error("Error fetching special attention results:", error);
      res.status(500).json({ message: "Failed to fetch special attention results" });
    }
  });

  // 특별 관리 이력 조회 (70점 미만 전체)
  app.get("/api/test-results/special-attention-history", async (req, res) => {
    try {
      const results = await storage.getSpecialAttentionHistory();
      res.json(results);
    } catch (error) {
      console.error("Error fetching special attention history:", error);
      res.status(500).json({ message: "Failed to fetch special attention history" });
    }
  });

  // 대처방안 저장
  app.put("/api/test-results/:id/special-note", async (req, res) => {
    try {
      const { specialNote } = req.body;
      if (!specialNote || specialNote.trim() === '') {
        return res.status(400).json({ message: "Special note is required" });
      }
      const result = await storage.updateSpecialNote(req.params.id, specialNote);
      res.json(result);
    } catch (error) {
      console.error("Error updating special note:", error);
      res.status(500).json({ message: "Failed to update special note" });
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

      // 학부모에게 SMS 발송 (비동기로 처리하여 응답 지연 방지)
      if (student.parentPhone) {
        // 섹션 이름 추가
        const sectionScoresWithNames = sectionScores.map((score: any, idx: number) => ({
          ...score,
          sectionName: test.sections[idx]?.name || `파트${score.sectionNumber}`,
        }));

        const assignedTasksWithNames = assignedTasks.map((task: any, idx: number) => ({
          ...task,
          sectionName: test.sections[idx]?.name || `파트${task.sectionNumber}`,
        }));

        // SMS 설정 가져오기
        const smsSettings = await storage.getSmsSettings();

        sendTestResultSMS(student.parentPhone, {
          studentName: student.name,
          testName: test.name,
          score: finalScore,
          totalQuestions,
          correctAnswers: totalScore,
          wrongAnswers: totalQuestions - totalScore,
          sectionScores: sectionScoresWithNames,
          assignedTasks: assignedTasksWithNames,
          completedAt: new Date(),
          smsSettings,
        }).then((smsResult) => {
          if (smsResult.success) {
            console.log(`[SMS] 성적 알림 발송 완료: ${student.name} -> ${student.parentPhone}`);
          } else {
            console.log(`[SMS] 성적 알림 발송 실패: ${smsResult.error}`);
          }
        }).catch((err) => {
          console.error('[SMS] 발송 중 오류:', err);
        });
      } else {
        console.log(`[SMS] 학부모 전화번호 없음: ${student.name}`);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Error submitting test:", error);
      res.status(500).json({ message: "Failed to submit test" });
    }
  });

  // SMS 테스트 엔드포인트
  app.post("/api/sms/test", async (req, res) => {
    try {
      const { phone, message } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ message: "Phone and message are required" });
      }

      const result = await sendTestSMS(phone, message);

      if (result.success) {
        res.json({ success: true, message: "SMS sent successfully" });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending test SMS:", error);
      res.status(500).json({ message: "Failed to send SMS" });
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

  // SMS 설정 API
  app.get("/api/sms-settings", async (req, res) => {
    try {
      const settings = await storage.getSmsSettings();
      if (!settings) {
        // 기본값 반환
        res.json({
          scoreMessage90: '훌륭합니다!',
          scoreMessage80: '잘했어요!',
          scoreMessage70: '조금만 더 노력하면 완벽해요!',
          scoreMessage60: '조금 더 복습이 필요해요.',
          scoreMessageBelow: '열심히 복습해주세요!',
          sectionFeedback90: '우수',
          sectionFeedback80: '양호',
          sectionFeedback70: '보통',
          sectionFeedback60: '노력',
          sectionFeedbackBelow: '복습필요',
          taskTypeLight: '기본',
          taskTypeMedium: '보충',
          taskTypeHeavy: '심화',
          defaultTaskLight: '시험지에 오답문제 정리해오기',
          defaultTaskMedium: '수업노트 필기 다시하고 오답문제 정리하기',
          defaultTaskHeavy: '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기',
          academyName: '목동에이원과학학원',
        });
        return;
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching SMS settings:", error);
      res.status(500).json({ message: "Failed to fetch SMS settings" });
    }
  });

  app.put("/api/sms-settings", async (req, res) => {
    try {
      const settings = await storage.updateSmsSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating SMS settings:", error);
      res.status(500).json({ message: "Failed to update SMS settings" });
    }
  });

  // ========================================
  // OMR 스캔 API 엔드포인트
  // ========================================

  // OMR 이미지 스캔 및 인식
  app.post("/api/omr/scan", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "이미지 파일이 필요합니다"
        });
      }

      console.log(`OMR 스캔 시작: ${req.file.originalname}, 크기: ${req.file.size} bytes`);

      // OMR 처리
      const result = await omrProcessor.processOMRSheet(req.file.buffer);

      // 학생 정보 조회 (학번으로)
      let studentInfo = null;
      if (result.studentId) {
        const student = await storage.getStudentByStudentId(result.studentId);
        if (student) {
          studentInfo = {
            id: student.id,
            studentId: student.studentId,
            name: student.name,
            grade: student.grade
          };
        }
      }

      // 테스트 정보 조회
      let testInfo = null;
      if (result.testId) {
        const test = await storage.getTestByTestId(result.testId);
        if (test) {
          testInfo = {
            id: test.id,
            testId: test.testId,
            name: test.name,
            subject: test.subject,
            grade: test.grade
          };
        }
      }

      res.json({
        success: result.success,
        scanResult: result,
        studentInfo,
        testInfo,
        needsReview: result.confidence < 0.8 || result.errors.length > 0
      });

    } catch (error) {
      console.error("OMR 스캔 오류:", error);
      res.status(500).json({
        success: false,
        message: "OMR 스캔 처리 중 오류가 발생했습니다",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // OMR 인식 결과 확인 후 제출
  app.post("/api/omr/submit", async (req, res) => {
    try {
      const { studentId, testId, answers, submitSource = 'omr-scan' } = req.body;

      // 필수 값 검증
      if (!studentId || !testId || !answers) {
        return res.status(400).json({
          success: false,
          message: "학번, 테스트 ID, 답안이 모두 필요합니다"
        });
      }

      // 학생 존재 확인
      const student = await storage.getStudentByStudentId(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `학생을 찾을 수 없습니다: ${studentId}`
        });
      }

      // 테스트 존재 확인
      const test = await storage.getTestByTestId(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: `테스트를 찾을 수 없습니다: ${testId}`
        });
      }

      // 채점 로직 (기존 submit 로직과 동일)
      const sectionScores: {
        sectionNumber: number;
        correct: number;
        total: number;
        wrongAnswers: number[];
      }[] = [];

      const assignedTasks: {
        sectionNumber: number;
        taskType: 'light' | 'medium' | 'heavy';
        task: string;
      }[] = [];

      let totalScore = 0;
      const totalQuestions = 30;

      for (const section of test.sections) {
        const sectionAnswers = answers.slice(
          (section.sectionNumber - 1) * 10,
          section.sectionNumber * 10
        );

        let correct = 0;
        const wrongAnswers: number[] = [];

        for (let i = 0; i < section.answers.length; i++) {
          const questionNumber = (section.sectionNumber - 1) * 10 + i + 1;
          if (section.answers[i] === sectionAnswers[i]) {
            correct++;
            totalScore++;
          } else {
            wrongAnswers.push(questionNumber);
          }
        }

        sectionScores.push({
          sectionNumber: section.sectionNumber,
          correct,
          total: section.answers.length,
          wrongAnswers
        });

        // 오답 개수에 따른 과제 유형
        const wrongCount = section.answers.length - correct;
        let taskType: 'light' | 'medium' | 'heavy';
        if (wrongCount <= 2) {
          taskType = 'light';
        } else if (wrongCount <= 4) {
          taskType = 'medium';
        } else {
          taskType = 'heavy';
        }

        assignedTasks.push({
          sectionNumber: section.sectionNumber,
          taskType,
          task: section.assignments[taskType]
        });
      }

      const finalScore = Math.round((totalScore / totalQuestions) * 100);

      // 결과 저장
      const testResult = await storage.createTestResult({
        studentId: student.id,
        testId: test.id,
        answers,
        score: finalScore,
        sectionScores,
        assignedTasks
      });

      // SMS 발송 (비동기)
      if (student.parentPhone) {
        sendTestResultSMS(student, test, testResult).catch(err => {
          console.error("SMS 발송 실패:", err);
        });
      }

      res.json({
        success: true,
        testResult: {
          ...testResult,
          studentName: student.name,
          testName: test.name
        }
      });

    } catch (error) {
      console.error("OMR 제출 오류:", error);
      res.status(500).json({
        success: false,
        message: "결과 저장 중 오류가 발생했습니다"
      });
    }
  });

  // 학생 목록 조회 (OMR 스캔에서 학생 검색용)
  app.get("/api/omr/students", async (req, res) => {
    try {
      const { search } = req.query;
      const students = await storage.searchStudents(search as string, undefined);
      res.json(students.map(s => ({
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        grade: s.grade
      })));
    } catch (error) {
      res.status(500).json({ message: "학생 목록 조회 실패" });
    }
  });

  // 테스트 목록 조회 (OMR 스캔에서 테스트 선택용)
  app.get("/api/omr/tests", async (req, res) => {
    try {
      const tests = await storage.getAllTests();
      res.json(tests.map(t => ({
        id: t.id,
        testId: t.testId,
        name: t.name,
        subject: t.subject,
        grade: t.grade
      })));
    } catch (error) {
      res.status(500).json({ message: "테스트 목록 조회 실패" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

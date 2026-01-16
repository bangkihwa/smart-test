import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { SolapiMessageService } from 'solapi';

// 솔라피 설정
const solapiApiKey = process.env.SOLAPI_API_KEY || '';
const solapiApiSecret = process.env.SOLAPI_API_SECRET || '';
const senderPhone = process.env.SOLAPI_SENDER_PHONE || '';

console.log('[SMS 초기화] API_KEY 존재:', !!solapiApiKey, 'API_SECRET 존재:', !!solapiApiSecret, 'SENDER_PHONE:', senderPhone);

let messageService: SolapiMessageService | null = null;
if (solapiApiKey && solapiApiSecret) {
  messageService = new SolapiMessageService(solapiApiKey, solapiApiSecret);
  console.log('[SMS 초기화] messageService 생성 완료');
} else {
  console.log('[SMS 초기화] API 키 없음 - messageService 생성 안됨');
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions
function mapStudent(data: any) {
  // subjects가 쉼표로 구분된 문자열이면 배열로 변환
  let subjects = null;
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

// 과목 배열을 쉼표 구분 문자열로 변환
function subjectsToString(subjects: string[] | null | undefined): string | null {
  if (!subjects || subjects.length === 0) return null;
  return subjects.join(',');
}

function mapTest(data: any) {
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

function mapTestResult(data: any) {
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

// SMS 관련 함수들
function getScoreMessage(score: number): string {
  if (score >= 90) return '훌륭합니다!';
  if (score >= 80) return '잘했어요!';
  if (score >= 70) return '조금만 더 노력하면 완벽해요!';
  if (score >= 60) return '조금 더 복습이 필요해요.';
  return '열심히 복습해주세요!';
}

function getTaskTypeName(taskType: string): string {
  switch (taskType) {
    case 'light': return '기본';
    case 'medium': return '보충';
    case 'heavy': return '심화';
    default: return '기본';
  }
}

// 파트별 점수에 따른 한단어 피드백
function getSectionFeedback(percentage: number): string {
  if (percentage >= 90) return '우수';
  if (percentage >= 80) return '양호';
  if (percentage >= 70) return '보통';
  if (percentage >= 60) return '노력';
  return '복습필요';
}

interface SectionScore {
  sectionNumber: number;
  sectionName?: string;
  correct: number;
  total: number;
  wrongAnswers: number[];
}

interface AssignedTask {
  sectionNumber: number;
  sectionName?: string;
  taskType: string;
  task: string;
}

function generateTestResultMessage(
  studentName: string,
  testName: string,
  score: number,
  totalQuestions: number,
  correctAnswers: number,
  sectionScores: SectionScore[],
  assignedTasks: AssignedTask[]
): string {
  const date = new Date();
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  let message = `[에이원과학학원 성적알림]

${studentName} 학생
${testName} 결과

${dateStr} 테스트 결과
총점: ${score}점
정답: ${correctAnswers}/${totalQuestions}문항
${getScoreMessage(score)}

[파트별 성적]
`;

  sectionScores.forEach((section) => {
    const sectionName = section.sectionName || `파트${section.sectionNumber}`;
    const percentage = Math.round((section.correct / section.total) * 100);
    const feedback = getSectionFeedback(percentage);
    message += `${sectionName}: ${section.correct}/${section.total} (${feedback})\n`;
  });

  const tasksWithWork = assignedTasks.filter(t => t.task && t.task.trim() !== '');
  if (tasksWithWork.length > 0) {
    message += '\n[보충 과제]\n';
    tasksWithWork.forEach(task => {
      const sectionName = task.sectionName || `파트${task.sectionNumber}`;
      message += `${sectionName}(${getTaskTypeName(task.taskType)}): ${task.task}\n`;
    });
  }

  message += '\n문의: 목동에이원과학학원';

  return message;
}

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!messageService || !senderPhone) {
    console.log('[SMS] 솔라피 설정 없음, 발송 건너뜀');
    return { success: false, error: 'SMS service not configured' };
  }

  const normalizedPhone = phone.replace(/-/g, '');
  if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
    return { success: false, error: 'Invalid phone number format' };
  }

  try {
    console.log(`[SMS] 발송 시도: ${normalizedPhone}`);
    await messageService.send({
      to: normalizedPhone,
      from: senderPhone,
      text: message,
    });
    console.log('[SMS] 발송 성공');
    return { success: true };
  } catch (error: any) {
    console.error('[SMS] 발송 실패:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method, body } = req;
  // Parse the path - handle both /api/xxx and /api?path=xxx formats
  let path = url || '/';
  // Remove query string first
  path = path.split('?')[0];
  // Remove /api prefix
  path = path.replace(/^\/api/, '') || '/';

  console.log('Request URL:', url, 'Parsed path:', path, 'Method:', method, 'Body:', JSON.stringify(body));

  try {
    // Students endpoints
    if (path === '/students' && method === 'GET') {
      const { search, grade } = req.query;
      let queryBuilder = supabase.from('students').select('*');

      if (search) {
        queryBuilder = queryBuilder.or(`student_name.ilike.%${search}%,student_id.ilike.%${search}%`);
      }
      if (grade) {
        queryBuilder = queryBuilder.eq('grade', grade);
      }

      const { data, error } = await queryBuilder.order('id', { ascending: true });
      if (error) throw error;
      return res.json((data || []).map(mapStudent));
    }

    if (path.match(/^\/students\/by-student-id\/(.+)$/) && method === 'GET') {
      const studentId = path.split('/').pop();
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error || !data) return res.status(404).json({ message: 'Student not found' });
      return res.json(mapStudent(data));
    }

    if (path === '/students/login' && method === 'POST') {
      console.log('Raw body type:', typeof body, 'Raw body:', body);
      const { studentId, name, grade } = body || {};

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error || !data) {
        return res.status(404).json({ message: '등록되지 않은 학생입니다. 관리자에게 문의하세요.' });
      }

      const student = mapStudent(data);
      const dbName = (data.student_name || data.name || '').trim();
      const reqName = (name || '').trim();
      if (dbName !== reqName) {
        return res.status(409).json({ message: '이름이 일치하지 않습니다. 다시 확인해주세요.' });
      }

      // 학생의 실제 학년 정보 반환 (DB에 있는 학년 사용)
      return res.json(student);
    }

    if (path === '/students' && method === 'POST') {
      const { data: maxIdData } = await supabase
        .from('students')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      const nextId = (maxIdData?.id || 0) + 1;

      const { data, error } = await supabase
        .from('students')
        .insert({
          id: nextId,
          student_id: body.studentId,
          student_name: body.name,
          grade: body.grade,
          phone: body.parentPhone || null,
          subjects: subjectsToString(body.subjects),
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(mapStudent(data));
    }

    if (path.match(/^\/students\/(\d+)$/) && method === 'PUT') {
      const id = path.split('/').pop();
      const updateData: any = {};
      if (body.studentId !== undefined) updateData.student_id = body.studentId;
      if (body.name !== undefined) updateData.student_name = body.name;
      if (body.grade !== undefined) updateData.grade = body.grade;
      if (body.parentPhone !== undefined) updateData.phone = body.parentPhone || null;
      if (body.subjects !== undefined) updateData.subjects = subjectsToString(body.subjects);

      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json(mapStudent(data));
    }

    if (path.match(/^\/students\/(\d+)$/) && method === 'DELETE') {
      const id = path.split('/').pop();
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      return res.status(204).end();
    }

    // Tests endpoints
    if (path === '/tests' && method === 'GET') {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json((data || []).map(mapTest));
    }

    if (path.match(/^\/tests\/by-test-id\/(.+)$/) && method === 'GET') {
      const testId = path.split('/').pop();
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('test_id', testId)
        .single();

      if (error || !data) return res.status(404).json({ message: 'Test not found' });
      return res.json(mapTest(data));
    }

    if (path.match(/^\/tests\/([a-f0-9-]+)$/) && method === 'GET') {
      const id = path.split('/').pop();
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return res.status(404).json({ message: 'Test not found' });
      return res.json(mapTest(data));
    }

    if (path === '/tests' && method === 'POST') {
      const { data, error } = await supabase
        .from('tests')
        .insert({
          test_id: body.testId,
          name: body.name,
          subject: body.subject,
          grade: body.grade || null,
          sections: body.sections,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(mapTest(data));
    }

    if (path.match(/^\/tests\/([a-f0-9-]+)$/) && method === 'PUT') {
      const id = path.split('/').pop();
      const updateData: any = {};
      if (body.testId !== undefined) updateData.test_id = body.testId;
      if (body.name !== undefined) updateData.name = body.name;
      if (body.subject !== undefined) updateData.subject = body.subject;
      if (body.grade !== undefined) updateData.grade = body.grade;
      if (body.sections !== undefined) updateData.sections = body.sections;

      const { data, error } = await supabase
        .from('tests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json(mapTest(data));
    }

    if (path.match(/^\/tests\/([a-f0-9-]+)$/) && method === 'DELETE') {
      const id = path.split('/').pop();
      const { error } = await supabase.from('tests').delete().eq('id', id);
      if (error) throw error;
      return res.status(204).end();
    }

    // Test Results endpoints
    if (path === '/test-results' && method === 'GET') {
      const { studentId, testId, startDate, endDate } = req.query;
      let queryBuilder = supabase.from('test_results').select('*');

      if (studentId) {
        queryBuilder = queryBuilder.eq('student_id', studentId);
      }
      if (testId) {
        queryBuilder = queryBuilder.eq('test_id', testId);
      }
      if (startDate) {
        queryBuilder = queryBuilder.gte('completed_at', new Date(startDate as string).toISOString());
      }
      if (endDate) {
        queryBuilder = queryBuilder.lte('completed_at', new Date(endDate as string).toISOString());
      }

      const { data, error } = await queryBuilder.order('completed_at', { ascending: false });
      if (error) throw error;
      return res.json((data || []).map(mapTestResult));
    }

    if (path === '/test-results/all' && method === 'GET') {
      const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('*')
        .order('completed_at', { ascending: false });

      if (resultsError) throw resultsError;

      const { data: students } = await supabase.from('students').select('*');
      const { data: tests } = await supabase.from('tests').select('*');

      // Map students by their studentId (e.g., 'h01001')
      const studentsMap = new Map();
      (students || []).forEach((s: any) => {
        studentsMap.set(s.student_id, mapStudent(s));
      });

      const testsMap = new Map();
      (tests || []).forEach((t: any) => testsMap.set(t.id, mapTest(t)));

      const resultsWithRelations = (results || []).map((r: any) => ({
        ...mapTestResult(r),
        student: studentsMap.get(r.student_id) || null,
        test: testsMap.get(r.test_id) || null,
      }));

      return res.json(resultsWithRelations);
    }

    if (path.match(/^\/test-results\/student\/(.+)$/) && method === 'GET') {
      const studentIdParam = path.split('/').pop();

      // Query test_results with original studentId
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('student_id', studentIdParam)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return res.json((data || []).map(mapTestResult));
    }

    if (path.match(/^\/test-results\/([a-f0-9-]+)$/) && method === 'GET') {
      const id = path.split('/').pop();
      const { data: resultData, error: resultError } = await supabase
        .from('test_results')
        .select('*')
        .eq('id', id)
        .single();

      if (resultError || !resultData) {
        return res.status(404).json({ message: 'Test result not found' });
      }

      const result = mapTestResult(resultData);

      // Get test details
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', result.testId)
        .single();

      return res.json({
        ...result,
        test: testData ? mapTest(testData) : null,
      });
    }

    if (path === '/test-results/submit' && method === 'POST') {
      const { studentId, testId, answers } = body;

      // Validate student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (studentError || !studentData) {
        return res.status(404).json({ message: 'Student not found. Please login first.' });
      }

      // Validate test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_id', testId)
        .single();

      if (testError || !testData) {
        return res.status(404).json({ message: 'Test not found' });
      }

      const test = mapTest(testData);

      // Calculate scores
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
        const wrongAnswers: number[] = [];

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
        let taskType: string;
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

      const { data, error } = await supabase
        .from('test_results')
        .insert({
          student_id: studentId,  // 원본 studentId 그대로 저장
          test_id: test.id,
          answers,
          score: finalScore,
          section_scores: sectionScores,
          assigned_tasks: assignedTasks,
        })
        .select()
        .single();

      if (error) throw error;

      // 학부모에게 SMS 발송 (동기 처리 - Vercel에서 비동기는 응답 후 끊김)
      const student = mapStudent(studentData);
      let smsResult = { success: false, error: 'Not attempted' };

      if (student.parentPhone) {
        const sectionScoresWithNames = sectionScores.map((score: any, idx: number) => ({
          ...score,
          sectionName: test.sections[idx]?.name || `파트${score.sectionNumber}`,
        }));

        const assignedTasksWithNames = assignedTasks.map((task: any, idx: number) => ({
          ...task,
          sectionName: test.sections[idx]?.name || `파트${task.sectionNumber}`,
        }));

        const smsMessage = generateTestResultMessage(
          student.name,
          test.name,
          finalScore,
          totalQuestions,
          totalScore,
          sectionScoresWithNames,
          assignedTasksWithNames
        );

        try {
          smsResult = await sendSMS(student.parentPhone, smsMessage);
          if (smsResult.success) {
            console.log(`[SMS] 성적 알림 발송 완료: ${student.name} -> ${student.parentPhone}`);
          } else {
            console.log(`[SMS] 성적 알림 발송 실패: ${smsResult.error}`);
          }
        } catch (err: any) {
          console.error('[SMS] 발송 중 오류:', err);
          smsResult = { success: false, error: err.message };
        }
      } else {
        console.log(`[SMS] 학부모 전화번호 없음: ${student.name}`);
      }

      return res.status(201).json({ ...mapTestResult(data), smsResult });
    }

    // Update special note for test result (대처방안 저장)
    if (path.match(/^\/test-results\/([a-f0-9-]+)\/special-note$/) && method === 'PUT') {
      const id = path.split('/')[2];
      const { specialNote } = body;

      const { data, error } = await supabase
        .from('test_results')
        .update({ special_note: specialNote })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json(mapTestResult(data));
    }

    // Get students needing special attention (70점 미만, 대처방안 미입력)
    if (path === '/test-results/special-attention' && method === 'GET') {
      const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('*')
        .lt('score', 70)
        .is('special_note', null)
        .order('completed_at', { ascending: false });

      if (resultsError) throw resultsError;

      const { data: students } = await supabase.from('students').select('*');
      const { data: tests } = await supabase.from('tests').select('*');

      const studentsMap = new Map();
      (students || []).forEach((s: any) => {
        studentsMap.set(s.student_id, mapStudent(s));
      });

      const testsMap = new Map();
      (tests || []).forEach((t: any) => testsMap.set(t.id, mapTest(t)));

      const resultsWithRelations = (results || []).map((r: any) => ({
        ...mapTestResult(r),
        student: studentsMap.get(r.student_id) || null,
        test: testsMap.get(r.test_id) || null,
      }));

      return res.json(resultsWithRelations);
    }

    // Get all students with special attention history (대처방안 입력된 것 포함)
    if (path === '/test-results/special-attention-history' && method === 'GET') {
      const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('*')
        .lt('score', 70)
        .order('completed_at', { ascending: false });

      if (resultsError) throw resultsError;

      const { data: students } = await supabase.from('students').select('*');
      const { data: tests } = await supabase.from('tests').select('*');

      const studentsMap = new Map();
      (students || []).forEach((s: any) => {
        studentsMap.set(s.student_id, mapStudent(s));
      });

      const testsMap = new Map();
      (tests || []).forEach((t: any) => testsMap.set(t.id, mapTest(t)));

      const resultsWithRelations = (results || []).map((r: any) => ({
        ...mapTestResult(r),
        student: studentsMap.get(r.student_id) || null,
        test: testsMap.get(r.test_id) || null,
      }));

      return res.json(resultsWithRelations);
    }

    // Get test statistics (응시자 수, 평균, 상위 5명 랭킹)
    if (path.match(/^\/test-results\/statistics\/([a-f0-9-]+)$/) && method === 'GET') {
      const testId = path.split('/').pop();

      // 해당 테스트의 모든 결과 조회
      const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .order('score', { ascending: false });

      if (resultsError) throw resultsError;

      if (!results || results.length === 0) {
        return res.json({
          totalStudents: 0,
          averageScore: 0,
          topRankers: [],
        });
      }

      // 학생 정보 조회
      const { data: students } = await supabase.from('students').select('*');
      const studentsMap = new Map();
      (students || []).forEach((s: any) => {
        studentsMap.set(s.student_id, mapStudent(s));
      });

      // 통계 계산
      const totalStudents = results.length;
      const totalScore = results.reduce((sum: number, r: any) => sum + r.score, 0);
      const averageScore = Math.round(totalScore / totalStudents);

      // 상위 5명 (이름 마스킹: 가운데 글자만 표시)
      const topRankers = results.slice(0, 5).map((r: any, idx: number) => {
        const student = studentsMap.get(r.student_id);
        let maskedName = '***';
        if (student?.name) {
          const name = student.name;
          if (name.length === 2) {
            maskedName = name[0] + '*';
          } else if (name.length === 3) {
            maskedName = '*' + name[1] + '*';
          } else if (name.length >= 4) {
            maskedName = '*' + name.slice(1, -1) + '*';
          }
        }
        return {
          rank: idx + 1,
          maskedName,
          score: r.score,
        };
      });

      return res.json({
        totalStudents,
        averageScore,
        topRankers,
      });
    }

    return res.status(404).json({ message: 'Not found' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

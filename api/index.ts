import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v5 as uuidv5 } from 'uuid';

const STUDENT_UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions
function mapStudent(data: any) {
  return {
    id: data.id?.toString() || data.id,
    studentId: data.student_id,
    name: data.student_name || data.name,
    grade: data.grade,
    createdAt: new Date(data.created_at || Date.now()),
  };
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
    completedAt: new Date(data.completed_at),
  };
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
      const { studentId, name, grade } = body;

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error || !data) {
        return res.status(404).json({ message: '등록되지 않은 학생입니다. 관리자에게 문의하세요.' });
      }

      const student = mapStudent(data);
      console.log('Login attempt - DB name:', data.student_name, 'Request name:', name, 'Match:', data.student_name === name);
      if (student.name !== name) {
        return res.status(409).json({ message: '이름이 일치하지 않습니다. 다시 확인해주세요.' });
      }

      return res.json({ ...student, grade });
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
        const studentUuid = uuidv5(studentId as string, STUDENT_UUID_NAMESPACE);
        queryBuilder = queryBuilder.eq('student_id', studentUuid);
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

      const studentsMapByUuid = new Map();
      (students || []).forEach((s: any) => {
        const studentUuid = uuidv5(s.student_id, STUDENT_UUID_NAMESPACE);
        studentsMapByUuid.set(studentUuid, mapStudent(s));
      });

      const testsMap = new Map();
      (tests || []).forEach((t: any) => testsMap.set(t.id, mapTest(t)));

      const resultsWithRelations = (results || []).map((r: any) => ({
        ...mapTestResult(r),
        student: studentsMapByUuid.get(r.student_id) || null,
        test: testsMap.get(r.test_id) || null,
      }));

      return res.json(resultsWithRelations);
    }

    if (path.match(/^\/test-results\/student\/(.+)$/) && method === 'GET') {
      const studentId = path.split('/').pop();
      const studentUuid = uuidv5(studentId!, STUDENT_UUID_NAMESPACE);

      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('student_id', studentUuid)
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
      const studentUuid = uuidv5(studentId, STUDENT_UUID_NAMESPACE);

      const { data, error } = await supabase
        .from('test_results')
        .insert({
          student_id: studentUuid,
          test_id: test.id,
          answers,
          score: finalScore,
          section_scores: sectionScores,
          assigned_tasks: assignedTasks,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(mapTestResult(data));
    }

    return res.status(404).json({ message: 'Not found' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, Search, AlertTriangle, History, MessageSquare } from "lucide-react";

// 과목 목록 (Supabase에 한글로 저장)
const SUBJECTS = [
  { id: '물리', label: '물리' },
  { id: '화학', label: '화학' },
  { id: '생명', label: '생명' },
  { id: '지학', label: '지학' },
  { id: '통과', label: '통과' },
  { id: '내신', label: '내신' },
];
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Student, Test, TestResult, GradeLevel } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

type AdminView = 'dashboard' | 'students' | 'tests' | 'test-manage' | 'results' | 'analysis' | 'special' | 'sms';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  
  // Student analysis filters
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [analysisStudentSearch, setAnalysisStudentSearch] = useState<string>('');

  // Special attention states
  const [showHistory, setShowHistory] = useState(false);
  const [specialNoteInput, setSpecialNoteInput] = useState<{ [key: string]: string }>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Student list search
  const [studentSearch, setStudentSearch] = useState('');

  // Results view - test selection
  const [selectedGradeForResults, setSelectedGradeForResults] = useState<string>('');
  const [selectedTestIdForResults, setSelectedTestIdForResults] = useState<string>('');

  // Test list filter
  const [testListGradeFilter, setTestListGradeFilter] = useState<string>('');
  const [testListSubjectFilter, setTestListSubjectFilter] = useState<string>('');

  // Fetch data
  const { data: students } = useQuery<Student[]>({ queryKey: ['/api/students'] });
  const { data: tests } = useQuery<Test[]>({ queryKey: ['/api/tests'] });
  const { data: testResults } = useQuery<(TestResult & { student: Student, test: Test })[]>({ queryKey: ['/api/test-results/all'] });

  // Special attention data
  const { data: specialAttention, refetch: refetchSpecialAttention } = useQuery<(TestResult & { student: Student, test: Test })[]>({
    queryKey: ['/api/test-results/special-attention'],
    enabled: currentView === 'special'
  });
  const { data: specialAttentionHistory, refetch: refetchSpecialHistory } = useQuery<(TestResult & { student: Student, test: Test })[]>({
    queryKey: ['/api/test-results/special-attention-history'],
    enabled: currentView === 'special' && showHistory
  });

  // SMS 설정 데이터
  const { data: smsSettings, refetch: refetchSmsSettings } = useQuery<any>({
    queryKey: ['/api/sms-settings'],
    enabled: currentView === 'sms'
  });

  // Student management
  const [studentForm, setStudentForm] = useState({
    studentId: '',
    name: '',
    grade: '' as GradeLevel | '',
    parentPhone: '',
    subjects: [] as string[],
  });

  const [testForm, setTestForm] = useState({
    testId: '',
    name: '',
    subject: '',
    grade: '' as GradeLevel | '',
    sections: [
      {
        sectionNumber: 1,
        name: '',
        coreContent: '',
        answers: new Array(10).fill(1),
        assignments: { 
          light: '시험지에 오답문제 정리해오기', 
          medium: '수업노트 필기 다시하고 오답문제 정리하기', 
          heavy: '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기' 
        }
      },
      {
        sectionNumber: 2,
        name: '',
        coreContent: '',
        answers: new Array(10).fill(1),
        assignments: { 
          light: '시험지에 오답문제 정리해오기', 
          medium: '수업노트 필기 다시하고 오답문제 정리하기', 
          heavy: '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기' 
        }
      },
      {
        sectionNumber: 3,
        name: '',
        coreContent: '',
        answers: new Array(10).fill(1),
        assignments: { 
          light: '시험지에 오답문제 정리해오기', 
          medium: '수업노트 필기 다시하고 오답문제 정리하기', 
          heavy: '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기' 
        }
      }
    ]
  });

  const createStudentMutation = useMutation({
    mutationFn: async (studentData: any) => {
      const response = await apiRequest('POST', '/api/students', studentData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setStudentModalOpen(false);
      setStudentForm({ studentId: '', name: '', grade: '', parentPhone: '', subjects: [] });
      toast({ title: "학생이 추가되었습니다." });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "학생 추가 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, studentData }: { id: string, studentData: any }) => {
      const response = await apiRequest('PUT', `/api/students/${id}`, studentData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setStudentModalOpen(false);
      setEditingStudent(null);
      setStudentForm({ studentId: '', name: '', grade: '', parentPhone: '', subjects: [] });
      toast({ title: "학생 정보가 수정되었습니다." });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({ title: "학생이 삭제되었습니다." });
    },
  });

  const createTestMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await apiRequest('POST', '/api/tests', testData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      toast({ title: "테스트가 생성되었습니다." });
      resetTestForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "테스트 생성 실패", 
        description: error.message || "다시 시도해주세요.",
        variant: "destructive" 
      });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ id, testData }: { id: string, testData: any }) => {
      const response = await apiRequest('PUT', `/api/tests/${id}`, testData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      toast({ title: "테스트가 수정되었습니다." });
      resetTestForm();
      setEditingTest(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "테스트 수정 실패", 
        description: error.message || "다시 시도해주세요.",
        variant: "destructive" 
      });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      toast({ title: "테스트가 삭제되었습니다." });
    },
    onError: () => {
      toast({
        title: "테스트 삭제 실패",
        description: "다시 시도해주세요.",
        variant: "destructive"
      });
    },
  });

  // Special note mutation (대처방안 저장)
  const saveSpecialNoteMutation = useMutation({
    mutationFn: async ({ id, specialNote }: { id: string, specialNote: string }) => {
      const response = await apiRequest('PUT', `/api/test-results/${id}/special-note`, { specialNote });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-results/special-attention'] });
      queryClient.invalidateQueries({ queryKey: ['/api/test-results/special-attention-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/test-results/all'] });
      setEditingNoteId(null);
      toast({ title: "대처방안이 저장되었습니다." });
    },
    onError: () => {
      toast({
        title: "대처방안 저장 실패",
        description: "다시 시도해주세요.",
        variant: "destructive"
      });
    },
  });

  const handleSaveSpecialNote = (resultId: string) => {
    const note = specialNoteInput[resultId];
    if (!note || note.trim() === '') {
      toast({
        title: "대처방안을 입력해주세요",
        variant: "destructive"
      });
      return;
    }
    saveSpecialNoteMutation.mutate({ id: resultId, specialNote: note });
  };

  // SMS 설정 폼
  const [smsSettingsForm, setSmsSettingsForm] = useState({
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

  // SMS 설정 로드 시 폼 업데이트
  useMemo(() => {
    if (smsSettings && currentView === 'sms') {
      setSmsSettingsForm({
        scoreMessage90: smsSettings.scoreMessage90 || '훌륭합니다!',
        scoreMessage80: smsSettings.scoreMessage80 || '잘했어요!',
        scoreMessage70: smsSettings.scoreMessage70 || '조금만 더 노력하면 완벽해요!',
        scoreMessage60: smsSettings.scoreMessage60 || '조금 더 복습이 필요해요.',
        scoreMessageBelow: smsSettings.scoreMessageBelow || '열심히 복습해주세요!',
        sectionFeedback90: smsSettings.sectionFeedback90 || '우수',
        sectionFeedback80: smsSettings.sectionFeedback80 || '양호',
        sectionFeedback70: smsSettings.sectionFeedback70 || '보통',
        sectionFeedback60: smsSettings.sectionFeedback60 || '노력',
        sectionFeedbackBelow: smsSettings.sectionFeedbackBelow || '복습필요',
        taskTypeLight: smsSettings.taskTypeLight || '기본',
        taskTypeMedium: smsSettings.taskTypeMedium || '보충',
        taskTypeHeavy: smsSettings.taskTypeHeavy || '심화',
        defaultTaskLight: smsSettings.defaultTaskLight || '시험지에 오답문제 정리해오기',
        defaultTaskMedium: smsSettings.defaultTaskMedium || '수업노트 필기 다시하고 오답문제 정리하기',
        defaultTaskHeavy: smsSettings.defaultTaskHeavy || '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기',
        academyName: smsSettings.academyName || '목동에이원과학학원',
      });
    }
  }, [smsSettings, currentView]);

  // SMS 설정 저장 mutation
  const saveSmsSettingsMutation = useMutation({
    mutationFn: async (settings: typeof smsSettingsForm) => {
      const response = await apiRequest('PUT', '/api/sms-settings', settings);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-settings'] });
      toast({ title: "SMS 설정이 저장되었습니다." });
    },
    onError: () => {
      toast({
        title: "SMS 설정 저장 실패",
        description: "다시 시도해주세요.",
        variant: "destructive"
      });
    },
  });

  const resetTestForm = () => {
    setTestForm({
      testId: '',
      name: '',
      subject: '',
      grade: '',
      sections: [
        {
          sectionNumber: 1,
          name: '',
          coreContent: '',
          answers: new Array(10).fill(1),
          assignments: { 
            light: '시험지에 오답문제 정리해오기', 
            medium: '수업노트 필기 다시하고 오답문제 정리하기', 
            heavy: '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기' 
          }
        },
        {
          sectionNumber: 2,
          name: '',
          coreContent: '',
          answers: new Array(10).fill(1),
          assignments: { 
            light: '시험지에 오답문제 정리해오기', 
            medium: '수업노트 필기 다시하고 오답문제 정리하기', 
            heavy: '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기' 
          }
        },
        {
          sectionNumber: 3,
          name: '',
          coreContent: '',
          answers: new Array(10).fill(1),
          assignments: { 
            light: '시험지에 오답문제 정리해오기', 
            medium: '수업노트 필기 다시하고 오답문제 정리하기', 
            heavy: '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기' 
          }
        }
      ]
    });
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateStudentMutation.mutate({
        id: editingStudent.id,
        studentData: studentForm,
      });
    } else {
      createStudentMutation.mutate(studentForm);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      studentId: student.studentId,
      name: student.name,
      grade: student.grade as GradeLevel,
      parentPhone: student.parentPhone || '',
      subjects: student.subjects || [],
    });
    setStudentModalOpen(true);
  };

  // 과목 체크박스 토글
  const handleSubjectToggle = (subjectId: string) => {
    setStudentForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(s => s !== subjectId)
        : [...prev.subjects, subjectId]
    }));
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('정말 이 학생을 삭제하시겠습니까?')) {
      deleteStudentMutation.mutate(id);
    }
  };

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-generate testId if not provided
    let finalTestId = testForm.testId?.trim();
    if (!finalTestId) {
      finalTestId = `TEST_${Date.now()}`;
    }

    if (!testForm.name || testForm.name.trim() === '') {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "단원명을 입력해주세요.",
      });
      return;
    }
    
    if (!testForm.subject) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "과목을 선택해주세요.",
      });
      return;
    }
    
    if (!testForm.grade) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "학년을 선택해주세요.",
      });
      return;
    }
    
    // Validate sections
    for (let i = 0; i < testForm.sections.length; i++) {
      const section = testForm.sections[i];
      
      if (!section.name || section.name.trim() === '') {
        toast({
          variant: "destructive",
          title: "입력 오류",
          description: `${i + 1}번 섹션의 섹션명을 입력해주세요.`,
        });
        return;
      }
      
      if (!section.coreContent || section.coreContent.trim() === '') {
        toast({
          variant: "destructive",
          title: "입력 오류",
          description: `${i + 1}번 섹션의 핵심 내용을 입력해주세요.`,
        });
        return;
      }
      
      if (!section.assignments.light || section.assignments.light.trim() === '') {
        toast({
          variant: "destructive",
          title: "입력 오류",
          description: `${i + 1}번 섹션의 '하' 과제를 입력해주세요.`,
        });
        return;
      }
      
      if (!section.assignments.medium || section.assignments.medium.trim() === '') {
        toast({
          variant: "destructive",
          title: "입력 오류",
          description: `${i + 1}번 섹션의 '중' 과제를 입력해주세요.`,
        });
        return;
      }
      
      if (!section.assignments.heavy || section.assignments.heavy.trim() === '') {
        toast({
          variant: "destructive",
          title: "입력 오류",
          description: `${i + 1}번 섹션의 '상' 과제를 입력해주세요.`,
        });
        return;
      }
    }
    
    const submitData = { ...testForm, testId: finalTestId };

    if (editingTest) {
      updateTestMutation.mutate({
        id: editingTest.id,
        testData: submitData,
      });
    } else {
      createTestMutation.mutate(submitData);
    }
  };

  const handleEditTest = (test: Test) => {
    setEditingTest(test);
    setTestForm({
      testId: test.testId,
      name: test.name,
      subject: test.subject,
      grade: test.grade || '',
      sections: test.sections.map(section => ({
        ...section,
        answers: Array.isArray(section.answers) ? [...section.answers] : [],
        assignments: section.assignments ? { ...section.assignments } : { light: '', medium: '', heavy: '' },
      })),
    });
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTest = (id: string) => {
    if (confirm('정말 이 테스트를 삭제하시겠습니까?\n삭제하면 관련된 모든 결과도 함께 삭제됩니다.')) {
      deleteTestMutation.mutate(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingTest(null);
    resetTestForm();
  };

  const updateTestSection = (sectionIndex: number, field: string, value: any) => {
    const newSections = testForm.sections.map((section, idx) => {
      if (idx === sectionIndex) {
        if (field.startsWith('assignments.')) {
          const assignmentType = field.split('.')[1];
          return {
            ...section,
            assignments: {
              ...section.assignments,
              [assignmentType]: value,
            },
          };
        } else {
          return {
            ...section,
            [field]: value,
          };
        }
      }
      return section;
    });
    setTestForm({ ...testForm, sections: newSections });
  };

  const updateAnswer = (sectionIndex: number, questionIndex: number, answer: number) => {
    const newSections = testForm.sections.map((section, idx) => {
      if (idx === sectionIndex) {
        const newAnswers = [...section.answers];
        newAnswers[questionIndex] = answer;
        return {
          ...section,
          answers: newAnswers,
        };
      }
      return section;
    });
    setTestForm({ ...testForm, sections: newSections });
  };

  // Calculate stats
  const totalStudents = students?.length || 0;
  const recentTests = testResults?.filter((result: TestResult) => {
    const resultDate = new Date(result.completedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return resultDate > weekAgo;
  }).length || 0;
  
  const averageScore = testResults?.length 
    ? Math.round(testResults.reduce((sum: number, result: TestResult) => sum + result.score, 0) / testResults.length * 10) / 10
    : 0;

  const pendingAssignments = testResults?.filter((result: TestResult) => 
    result.assignedTasks.some(task => task.taskType !== 'light')
  ).length || 0;

  const renderDashboard = () => (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">대시보드</h2>
        <p className="text-muted-foreground">학생 성적 및 과제 현황을 확인하세요</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-muted-foreground">전체</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{totalStudents}</div>
            <div className="text-sm text-muted-foreground">등록 학생 수</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-muted-foreground">이번 주</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{recentTests}</div>
            <div className="text-sm text-muted-foreground">제출된 테스트</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-muted-foreground">평균</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{averageScore}</div>
            <div className="text-sm text-muted-foreground">전체 평균 점수</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-muted-foreground">추가과제</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{pendingAssignments}</div>
            <div className="text-sm text-muted-foreground">집중 관리 필요</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tests Table */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>최근 테스트 결과</CardTitle>
            <Button variant="ghost" onClick={() => setCurrentView('results')}>
              전체보기 <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생</TableHead>
                <TableHead>테스트</TableHead>
                <TableHead>점수</TableHead>
                <TableHead>제출일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testResults?.slice(0, 5).map((result: any) => {
                return (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.student?.name || '알 수 없음'}</TableCell>
                    <TableCell>{result.test?.name || '알 수 없음'}</TableCell>
                    <TableCell>
                      <Badge variant={result.score >= 80 ? 'default' : result.score >= 60 ? 'secondary' : 'destructive'}>
                        {result.score}점
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(result.completedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 등록된 테스트 관리 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>등록된 테스트 관리</CardTitle>
              <Badge variant="secondary">{tests?.length || 0}개</Badge>
            </div>
            <Button variant="ghost" onClick={() => setCurrentView('tests')}>
              테스트 생성 <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Select value={testListGradeFilter} onValueChange={setTestListGradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="전체 학년" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 학년</SelectItem>
                <SelectItem value="중등1학년">중등1학년</SelectItem>
                <SelectItem value="중등2학년">중등2학년</SelectItem>
                <SelectItem value="중등3학년">중등3학년</SelectItem>
                <SelectItem value="고등1학년">고등1학년</SelectItem>
                <SelectItem value="고등2학년">고등2학년</SelectItem>
                <SelectItem value="고등3학년">고등3학년</SelectItem>
              </SelectContent>
            </Select>
            <Select value={testListSubjectFilter} onValueChange={setTestListSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="전체 과목" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 과목</SelectItem>
                <SelectItem value="내신대비">내신대비</SelectItem>
                <SelectItem value="통합과학">통합과학</SelectItem>
                <SelectItem value="물리">물리</SelectItem>
                <SelectItem value="화학">화학</SelectItem>
                <SelectItem value="생명">생명</SelectItem>
                <SelectItem value="지구과학">지구과학</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setTestListGradeFilter('');
                setTestListSubjectFilter('');
              }}
            >
              필터 초기화
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>테스트 ID</TableHead>
                <TableHead>단원명</TableHead>
                <TableHead>과목</TableHead>
                <TableHead>학년</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const filteredTests = tests?.filter((test: Test) => {
                  if (testListGradeFilter && testListGradeFilter !== 'all' && test.grade !== testListGradeFilter) return false;
                  if (testListSubjectFilter && testListSubjectFilter !== 'all' && test.subject !== testListSubjectFilter) return false;
                  return true;
                }) || [];

                if (filteredTests.length > 0) {
                  return filteredTests.slice(0, 10).map((test: Test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-mono text-sm">{test.testId}</TableCell>
                      <TableCell className="font-medium">{test.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{test.subject}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{test.grade || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleEditTest(test);
                              setCurrentView('tests');
                            }}
                            title="수정"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTest(test.id)}
                            className="text-destructive hover:text-destructive"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                } else {
                  return (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {tests && tests.length > 0
                          ? '조건에 맞는 테스트가 없습니다'
                          : '등록된 테스트가 없습니다'}
                      </TableCell>
                    </TableRow>
                  );
                }
              })()}
            </TableBody>
          </Table>
          {tests && tests.length > 10 && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => setCurrentView('tests')}>
                전체 {tests.length}개 테스트 보기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 학년 정렬 순서 (중등1 -> 중등2 -> 중등3 -> 고등1 -> 고등2 -> 고등3)
  const gradeOrder: Record<string, number> = {
    '중등1학년': 1, '중등 1학년': 1, '중1': 1,
    '중등2학년': 2, '중등 2학년': 2, '중2': 2,
    '중등3학년': 3, '중등 3학년': 3, '중3': 3,
    '고등1학년': 4, '고등 1학년': 4, '고1': 4,
    '고등2학년': 5, '고등 2학년': 5, '고2': 5,
    '고등3학년': 6, '고등 3학년': 6, '고3': 6,
  };

  const getGradeOrder = (grade: string): number => {
    return gradeOrder[grade] || 99;
  };

  // 학생 검색 필터링 및 학년별 정렬
  const filteredStudents = useMemo(() => {
    if (!students) return [];

    let result = [...students];

    // 검색 필터 적용
    if (studentSearch.trim()) {
      const searchLower = studentSearch.toLowerCase().trim();
      result = result.filter(student =>
        student.name.toLowerCase().includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower)
      );
    }

    // 학년별 정렬 (중등1 -> 중등2 -> 중등3 -> 고등1 -> 고등2 -> 고등3)
    result.sort((a, b) => {
      const orderA = getGradeOrder(a.grade);
      const orderB = getGradeOrder(b.grade);
      if (orderA !== orderB) return orderA - orderB;
      // 같은 학년이면 이름순
      return a.name.localeCompare(b.name, 'ko');
    });

    return result;
  }, [students, studentSearch]);

  const renderStudents = () => (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">학생 관리</h2>
            <p className="text-muted-foreground">학생 정보를 추가, 수정, 삭제할 수 있습니다</p>
          </div>
          <Dialog open={studentModalOpen} onOpenChange={setStudentModalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-student-button">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                학생 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStudent ? '학생 수정' : '학생 추가'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">학생 ID</label>
                  <Input
                    value={studentForm.studentId}
                    onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                    placeholder="예: STU001"
                    required
                    data-testid="student-id-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">이름</label>
                  <Input
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    placeholder="예: 김철수"
                    required
                    data-testid="student-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">학년</label>
                  <Select value={studentForm.grade} onValueChange={(value: GradeLevel) => setStudentForm({ ...studentForm, grade: value })}>
                    <SelectTrigger data-testid="student-grade-select">
                      <SelectValue placeholder="학년 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="중등1학년">중등1학년</SelectItem>
                      <SelectItem value="중등2학년">중등2학년</SelectItem>
                      <SelectItem value="중등3학년">중등3학년</SelectItem>
                      <SelectItem value="고등1학년">고등1학년</SelectItem>
                      <SelectItem value="고등2학년">고등2학년</SelectItem>
                      <SelectItem value="고등3학년">고등3학년</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">학부모 전화번호</label>
                  <Input
                    value={studentForm.parentPhone}
                    onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                    placeholder="예: 010-1234-5678"
                    data-testid="student-parent-phone-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">수강 과목</label>
                  <p className="text-xs text-muted-foreground mb-3">수강하는 과목을 모두 선택하세요</p>
                  <div className="grid grid-cols-3 gap-3">
                    {SUBJECTS.map((subject) => (
                      <div key={subject.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subject-${subject.id}`}
                          checked={studentForm.subjects.includes(subject.id)}
                          onCheckedChange={() => handleSubjectToggle(subject.id)}
                        />
                        <Label
                          htmlFor={`subject-${subject.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {subject.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1" data-testid="save-student-button">
                    {editingStudent ? '수정' : '추가'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStudentModalOpen(false);
                      setEditingStudent(null);
                      setStudentForm({ studentId: '', name: '', grade: '', parentPhone: '', subjects: [] });
                    }}
                  >
                    취소
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 검색창 */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="학생 이름 또는 ID로 검색..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {studentSearch && (
          <p className="text-sm text-muted-foreground mt-2">
            {filteredStudents.length}명의 학생을 찾았습니다
          </p>
        )}
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생 ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>학년</TableHead>
                <TableHead>수강 과목</TableHead>
                <TableHead>학부모 전화번호</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student: Student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.subjects && student.subjects.length > 0 ? (
                        student.subjects.map((subjectId) => (
                          <Badge key={subjectId} variant="secondary" className="text-xs">
                            {subjectId}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{student.parentPhone || '-'}</TableCell>
                  <TableCell>{new Date(student.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditStudent(student)}
                        data-testid={`edit-student-${student.id}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteStudent(student.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-student-${student.id}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderTests = () => (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          {editingTest ? '테스트 수정' : '테스트 생성'}
        </h2>
        <p className="text-muted-foreground">
          {editingTest 
            ? '테스트 정보를 수정하고 저장하세요' 
            : '새로운 테스트를 생성하고 문항을 입력하세요'
          }
        </p>
        {editingTest && (
          <Badge variant="outline" className="mt-2">
            수정 중: {editingTest.testId}
          </Badge>
        )}
      </div>

      <form onSubmit={handleTestSubmit} className="max-w-4xl space-y-6">
        {/* Test Info */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">테스트 ID</label>
                <Input
                  value={testForm.testId}
                  onChange={(e) => setTestForm({ ...testForm, testId: e.target.value })}
                  placeholder="예: TEST001"
                  data-testid="test-id-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">과목 <span className="text-destructive">*</span></label>
                <Select value={testForm.subject} onValueChange={(value) => setTestForm({ ...testForm, subject: value })}>
                  <SelectTrigger data-testid="test-subject-select">
                    <SelectValue placeholder="과목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="내신대비">내신대비</SelectItem>
                    <SelectItem value="통합과학">통합과학</SelectItem>
                    <SelectItem value="물리">물리</SelectItem>
                    <SelectItem value="화학">화학</SelectItem>
                    <SelectItem value="생명">생명</SelectItem>
                    <SelectItem value="지구과학">지구과학</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">학년 <span className="text-destructive">*</span></label>
                <Select value={testForm.grade} onValueChange={(value) => setTestForm({ ...testForm, grade: value as GradeLevel })}>
                  <SelectTrigger data-testid="test-grade-select">
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="중등1학년">중등1학년</SelectItem>
                    <SelectItem value="중등2학년">중등2학년</SelectItem>
                    <SelectItem value="중등3학년">중등3학년</SelectItem>
                    <SelectItem value="고등1학년">고등1학년</SelectItem>
                    <SelectItem value="고등2학년">고등2학년</SelectItem>
                    <SelectItem value="고등3학년">고등3학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">단원명</label>
              <Input
                value={testForm.name}
                onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                placeholder="예: 알칼리금속과 할로젠"
                data-testid="test-name-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {testForm.sections.map((section, sectionIndex) => (
          <Card key={section.sectionNumber}>
            <CardHeader>
              <CardTitle>{section.sectionNumber}부: 문항 {(section.sectionNumber - 1) * 10 + 1}-{section.sectionNumber * 10}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">섹션명</label>
                <Input
                  value={section.name}
                  onChange={(e) => updateTestSection(sectionIndex, 'name', e.target.value)}
                  placeholder={`예: ${sectionIndex === 0 ? '알칼리금속' : sectionIndex === 1 ? '할로젠원소' : '주기적성질'}`}
                  data-testid={`section-name-${sectionIndex + 1}`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">핵심 내용</label>
                <Textarea
                  value={section.coreContent}
                  onChange={(e) => updateTestSection(sectionIndex, 'coreContent', e.target.value)}
                  placeholder="이 섹션의 핵심 개념을 입력하세요..."
                  rows={3}
                  data-testid={`section-core-content-${sectionIndex + 1}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">정답 입력 ({(section.sectionNumber - 1) * 10 + 1}-{section.sectionNumber * 10}번)</label>
                <div className="grid grid-cols-5 gap-3">
                  {section.answers.map((answer, questionIndex) => {
                    const questionNumber = (section.sectionNumber - 1) * 10 + questionIndex + 1;
                    return (
                      <div key={questionIndex}>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Q{questionNumber}
                        </label>
                        <Select
                          value={answer.toString()}
                          onValueChange={(value) => updateAnswer(sectionIndex, questionIndex, parseInt(value))}
                        >
                          <SelectTrigger className="text-sm" data-testid={`answer-select-q${questionNumber}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">추가 과제 (오답별)</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">0-2개 오답</label>
                    <Input
                      value={section.assignments.light}
                      onChange={(e) => updateTestSection(sectionIndex, 'assignments.light', e.target.value)}
                      placeholder="오답 문제 복습"
                      className="text-sm"
                      data-testid={`assignment-light-section-${sectionIndex + 1}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">3-4개 오답</label>
                    <Input
                      value={section.assignments.medium}
                      onChange={(e) => updateTestSection(sectionIndex, 'assignments.medium', e.target.value)}
                      placeholder="핵심 개념 정리 + 유사 문제 풀이"
                      className="text-sm"
                      data-testid={`assignment-medium-section-${sectionIndex + 1}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">5개 이상 오답</label>
                    <Input
                      value={section.assignments.heavy}
                      onChange={(e) => updateTestSection(sectionIndex, 'assignments.heavy', e.target.value)}
                      placeholder="전체 개념 재학습 + 심화 과제"
                      className="text-sm"
                      data-testid={`assignment-heavy-section-${sectionIndex + 1}`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button 
            type="submit" 
            className="flex-1" 
            disabled={createTestMutation.isPending || updateTestMutation.isPending}
            data-testid="save-test-button"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {editingTest 
              ? (updateTestMutation.isPending ? '수정 중...' : '테스트 수정')
              : (createTestMutation.isPending ? '저장 중...' : '테스트 저장')
            }
          </Button>
          {editingTest && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancelEdit}
              data-testid="cancel-edit-button"
            >
              취소
            </Button>
          )}
        </div>
      </form>

      {/* Test List */}
      <div className="mt-12 max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-foreground">등록된 테스트</h3>
          <Badge variant="secondary">{tests?.length || 0}개</Badge>
        </div>

        {/* 필터 */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">학년 필터</label>
                <Select value={testListGradeFilter} onValueChange={setTestListGradeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 학년" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 학년</SelectItem>
                    <SelectItem value="중등1학년">중등1학년</SelectItem>
                    <SelectItem value="중등2학년">중등2학년</SelectItem>
                    <SelectItem value="중등3학년">중등3학년</SelectItem>
                    <SelectItem value="고등1학년">고등1학년</SelectItem>
                    <SelectItem value="고등2학년">고등2학년</SelectItem>
                    <SelectItem value="고등3학년">고등3학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">과목 필터</label>
                <Select value={testListSubjectFilter} onValueChange={setTestListSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 과목" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 과목</SelectItem>
                    <SelectItem value="내신대비">내신대비</SelectItem>
                    <SelectItem value="통합과학">통합과학</SelectItem>
                    <SelectItem value="물리">물리</SelectItem>
                    <SelectItem value="화학">화학</SelectItem>
                    <SelectItem value="생명">생명</SelectItem>
                    <SelectItem value="지구과학">지구과학</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTestListGradeFilter('');
                    setTestListSubjectFilter('');
                  }}
                  className="w-full"
                >
                  필터 초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>테스트 ID</TableHead>
                  <TableHead>단원명</TableHead>
                  <TableHead>과목</TableHead>
                  <TableHead>학년</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filteredTests = tests?.filter((test: Test) => {
                    if (testListGradeFilter && testListGradeFilter !== 'all' && test.grade !== testListGradeFilter) return false;
                    if (testListSubjectFilter && testListSubjectFilter !== 'all' && test.subject !== testListSubjectFilter) return false;
                    return true;
                  }) || [];

                  if (filteredTests.length > 0) {
                    return filteredTests.map((test: Test) => (
                      <TableRow key={test.id} className={editingTest?.id === test.id ? 'bg-primary/10' : ''}>
                        <TableCell className="font-mono text-sm">{test.testId}</TableCell>
                        <TableCell className="font-medium">{test.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{test.subject}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{test.grade || '-'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTest(test)}
                              data-testid={`edit-test-${test.id}`}
                              title="수정"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTest(test.id)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`delete-test-${test.id}`}
                              title="삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  } else {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {tests && tests.length > 0
                            ? '조건에 맞는 테스트가 없습니다'
                            : '등록된 테스트가 없습니다'}
                        </TableCell>
                      </TableRow>
                    );
                  }
                })()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTestManage = () => {
    const filteredTests = tests?.filter((test: Test) => {
      if (testListGradeFilter && testListGradeFilter !== 'all' && test.grade !== testListGradeFilter) return false;
      if (testListSubjectFilter && testListSubjectFilter !== 'all' && test.subject !== testListSubjectFilter) return false;
      return true;
    }) || [];

    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">테스트 관리</h2>
              <p className="text-muted-foreground">등록된 테스트를 조회, 수정, 삭제할 수 있습니다</p>
            </div>
            <Button onClick={() => setCurrentView('tests')}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              새 테스트 생성
            </Button>
          </div>
        </div>

        {/* 필터 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>필터</span>
              <Badge variant="secondary">총 {tests?.length || 0}개 / 필터 결과 {filteredTests.length}개</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">학년</label>
                <Select value={testListGradeFilter} onValueChange={setTestListGradeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 학년" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 학년</SelectItem>
                    <SelectItem value="중등1학년">중등1학년</SelectItem>
                    <SelectItem value="중등2학년">중등2학년</SelectItem>
                    <SelectItem value="중등3학년">중등3학년</SelectItem>
                    <SelectItem value="고등1학년">고등1학년</SelectItem>
                    <SelectItem value="고등2학년">고등2학년</SelectItem>
                    <SelectItem value="고등3학년">고등3학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">과목</label>
                <Select value={testListSubjectFilter} onValueChange={setTestListSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 과목" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 과목</SelectItem>
                    <SelectItem value="내신대비">내신대비</SelectItem>
                    <SelectItem value="통합과학">통합과학</SelectItem>
                    <SelectItem value="물리">물리</SelectItem>
                    <SelectItem value="화학">화학</SelectItem>
                    <SelectItem value="생명">생명</SelectItem>
                    <SelectItem value="지구과학">지구과학</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTestListGradeFilter('');
                    setTestListSubjectFilter('');
                  }}
                  className="w-full"
                >
                  필터 초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 테스트 목록 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>테스트 ID</TableHead>
                  <TableHead>단원명</TableHead>
                  <TableHead>과목</TableHead>
                  <TableHead>학년</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length > 0 ? (
                  filteredTests.map((test: Test) => (
                    <TableRow key={test.id} className={editingTest?.id === test.id ? 'bg-primary/10' : ''}>
                      <TableCell className="font-mono text-sm">{test.testId}</TableCell>
                      <TableCell className="font-medium">{test.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{test.subject}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{test.grade || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleEditTest(test);
                              setCurrentView('tests');
                            }}
                            title="수정"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            수정
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTest(test.id)}
                            title="삭제"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            삭제
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      {tests && tests.length > 0
                        ? '조건에 맞는 테스트가 없습니다'
                        : '등록된 테스트가 없습니다'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderResults = () => {
    // 선택된 테스트의 결과만 필터링하고 성적순으로 정렬
    const filteredAndSortedResults = selectedTestIdForResults
      ? testResults
          ?.filter((result: TestResult) => result.testId === selectedTestIdForResults)
          .sort((a, b) => b.score - a.score) // 성적 높은 순
      : [];

    // 선택된 테스트 정보
    const selectedTest = tests?.find((t: Test) => t.id === selectedTestIdForResults);

    // 통계 계산
    const stats = filteredAndSortedResults && filteredAndSortedResults.length > 0 ? {
      totalStudents: filteredAndSortedResults.length,
      avgScore: Math.round(filteredAndSortedResults.reduce((sum, r) => sum + r.score, 0) / filteredAndSortedResults.length * 10) / 10,
      maxScore: Math.max(...filteredAndSortedResults.map(r => r.score)),
      minScore: Math.min(...filteredAndSortedResults.map(r => r.score)),
    } : null;

    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">성적 조회</h2>
          <p className="text-muted-foreground">테스트를 선택하면 응시한 학생들의 성적을 순위별로 확인할 수 있습니다</p>
        </div>

        {/* 학년 및 테스트 선택 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>테스트 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">학년 선택</label>
                <Select
                  value={selectedGradeForResults}
                  onValueChange={(value) => {
                    setSelectedGradeForResults(value);
                    setSelectedTestIdForResults(''); // 학년 변경시 테스트 선택 초기화
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년을 먼저 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="중등1학년">중등1학년</SelectItem>
                    <SelectItem value="중등2학년">중등2학년</SelectItem>
                    <SelectItem value="중등3학년">중등3학년</SelectItem>
                    <SelectItem value="고등1학년">고등1학년</SelectItem>
                    <SelectItem value="고등2학년">고등2학년</SelectItem>
                    <SelectItem value="고등3학년">고등3학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">테스트 선택</label>
                <Select
                  value={selectedTestIdForResults}
                  onValueChange={setSelectedTestIdForResults}
                  disabled={!selectedGradeForResults}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedGradeForResults ? "테스트를 선택하세요" : "학년을 먼저 선택하세요"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tests
                      ?.filter((test: Test) => test.grade === selectedGradeForResults)
                      .map((test: Test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.name} ({test.subject})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        {stats && selectedTest && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{stats.totalStudents}명</div>
                <div className="text-sm text-muted-foreground">응시 인원</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.avgScore}점</div>
                <div className="text-sm text-muted-foreground">평균 점수</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.maxScore}점</div>
                <div className="text-sm text-muted-foreground">최고 점수</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.minScore}점</div>
                <div className="text-sm text-muted-foreground">최저 점수</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 결과 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTest ? `${selectedTest.name} - 성적 순위` : '테스트를 선택해주세요'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTestIdForResults ? (
              <div className="text-center py-12 text-muted-foreground">
                위에서 테스트를 선택하면 응시 학생들의 성적이 표시됩니다
              </div>
            ) : filteredAndSortedResults && filteredAndSortedResults.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">순위</TableHead>
                    <TableHead>학생 이름</TableHead>
                    <TableHead>학번</TableHead>
                    <TableHead>학년</TableHead>
                    <TableHead className="text-center">점수</TableHead>
                    <TableHead className="text-center">오답 수</TableHead>
                    <TableHead>응시 일시</TableHead>
                    <TableHead>과제 유형</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedResults.map((result: TestResult, index: number) => {
                    const totalErrors = result.sectionScores.reduce((sum: number, section: any) => sum + section.wrongAnswers.length, 0);
                    const maxTaskType = result.assignedTasks.reduce((max: string, task: any) =>
                      task.taskType === 'heavy' ? 'heavy' :
                      task.taskType === 'medium' && max !== 'heavy' ? 'medium' :
                      max === '' ? 'light' : max, '');

                    // 순위 배지 색상
                    const getRankBadge = (rank: number) => {
                      if (rank === 1) return <Badge className="bg-yellow-500 hover:bg-yellow-600">🥇 1등</Badge>;
                      if (rank === 2) return <Badge className="bg-gray-400 hover:bg-gray-500">🥈 2등</Badge>;
                      if (rank === 3) return <Badge className="bg-amber-600 hover:bg-amber-700">🥉 3등</Badge>;
                      return <Badge variant="outline">{rank}등</Badge>;
                    };

                    return (
                      <TableRow key={result.id} className={index < 3 ? 'bg-muted/30' : ''}>
                        <TableCell className="text-center font-bold">
                          {getRankBadge(index + 1)}
                        </TableCell>
                        <TableCell className="font-medium">{result.student?.name || '알 수 없음'}</TableCell>
                        <TableCell>{result.student?.studentId || '-'}</TableCell>
                        <TableCell>{result.student?.grade || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={result.score >= 80 ? 'default' : result.score >= 60 ? 'secondary' : 'destructive'}>
                            {result.score}점
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{totalErrors}개</TableCell>
                        <TableCell>{new Date(result.completedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            maxTaskType === 'heavy' ? 'destructive' :
                            maxTaskType === 'medium' ? 'secondary' :
                            'default'
                          }>
                            {maxTaskType === 'heavy' ? '심화' : maxTaskType === 'medium' ? '중급' : '기본'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                이 테스트를 응시한 학생이 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAnalysis = () => {
    // Filter students by search query for analysis
    const analysisFilteredStudents = students?.filter((s: Student) => {
      if (!analysisStudentSearch.trim()) return true;
      const query = analysisStudentSearch.toLowerCase();
      return s.name.toLowerCase().includes(query) || s.studentId.toLowerCase().includes(query);
    }) || [];

    // Filter test results by selected student and date range
    const filteredResults = testResults?.filter((result: TestResult) => {
      if (!selectedStudentId) return false;
      if (result.studentId !== selectedStudentId) return false;
      
      const resultDate = new Date(result.completedAt);
      if (startDate) {
        const start = new Date(startDate);
        if (resultDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (resultDate > end) return false;
      }
      
      return true;
    }) || [];

    // Sort by date
    const sortedResults = [...filteredResults].sort((a, b) => 
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    // Prepare chart data
    const chartData = sortedResults.map((result: TestResult) => {
      const test = tests?.find((t: Test) => t.id === result.testId);
      return {
        date: format(new Date(result.completedAt), 'MM/dd'),
        score: result.score,
        testName: test?.name || '알 수 없음',
      };
    });

    // Calculate average score
    const averageScore = sortedResults.length > 0
      ? Math.round(sortedResults.reduce((sum, r) => sum + r.score, 0) / sortedResults.length * 10) / 10
      : 0;

    // Get all assigned tasks
    const allTasks = sortedResults.flatMap((result: TestResult) => 
      result.assignedTasks.map(task => ({
        ...task,
        testName: tests?.find((t: Test) => t.id === result.testId)?.name || '알 수 없음',
        date: result.completedAt,
      }))
    );

    const selectedStudent = students?.find((s: Student) => s.id === selectedStudentId);

    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">학생별 성적 분석</h2>
          <p className="text-muted-foreground">학생을 선택하고 기간을 설정하여 성적과 과제를 분석하세요</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>필터 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">학생 검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="이름 또는 ID 검색..."
                    value={analysisStudentSearch}
                    onChange={(e) => setAnalysisStudentSearch(e.target.value)}
                    className="pl-10"
                    data-testid="analysis-student-search"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">학생 선택</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger data-testid="select-student-analysis">
                    <SelectValue placeholder="학생을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {analysisFilteredStudents.map((student: Student) => (
                      <SelectItem key={student.id} value={student.studentId}>
                        {student.name} ({student.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">시작일</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">종료일</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedStudentId ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg text-muted-foreground">학생을 선택하여 성적을 분석하세요</p>
            </CardContent>
          </Card>
        ) : sortedResults.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg text-muted-foreground">
                선택한 기간에 테스트 결과가 없습니다
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">{selectedStudent?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedStudent?.grade}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">{sortedResults.length}</div>
                  <div className="text-sm text-muted-foreground">응시한 테스트</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">{averageScore}</div>
                  <div className="text-sm text-muted-foreground">평균 점수</div>
                </CardContent>
              </Card>
            </div>

            {/* Score Trend Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>성적 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
                                <p className="font-medium">{payload[0].payload.testName}</p>
                                <p className="text-sm text-muted-foreground">날짜: {payload[0].payload.date}</p>
                                <p className="text-sm font-bold text-primary">점수: {payload[0].value}점</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Test Results Table */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>테스트 결과</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>테스트</TableHead>
                      <TableHead>점수</TableHead>
                      <TableHead>오답 수</TableHead>
                      <TableHead>과제 유형</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResults.map((result: TestResult) => {
                      const test = tests?.find((t: Test) => t.id === result.testId);
                      const totalErrors = result.sectionScores.reduce((sum, section) => sum + section.wrongAnswers.length, 0);
                      const maxTaskType = result.assignedTasks.reduce((max, task) => 
                        task.taskType === 'heavy' ? 'heavy' : 
                        task.taskType === 'medium' && max !== 'heavy' ? 'medium' : 
                        max === '' ? 'light' : max, '');
                      
                      return (
                        <TableRow key={result.id}>
                          <TableCell>{format(new Date(result.completedAt), 'yyyy-MM-dd')}</TableCell>
                          <TableCell className="font-medium">{test?.name || '알 수 없음'}</TableCell>
                          <TableCell>
                            <Badge variant={result.score >= 80 ? 'default' : result.score >= 60 ? 'secondary' : 'destructive'}>
                              {result.score}점
                            </Badge>
                          </TableCell>
                          <TableCell>{totalErrors}개</TableCell>
                          <TableCell>
                            <Badge variant={
                              maxTaskType === 'heavy' ? 'destructive' : 
                              maxTaskType === 'medium' ? 'secondary' : 
                              'default'
                            }>
                              {maxTaskType === 'heavy' ? '심화' : maxTaskType === 'medium' ? '중급' : '기본'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Assigned Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>부여된 과제</CardTitle>
              </CardHeader>
              <CardContent>
                {allTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">부여된 과제가 없습니다</p>
                ) : (
                  <div className="space-y-4">
                    {allTasks.map((task, index) => (
                      <div 
                        key={index} 
                        className="border border-border rounded-lg p-4"
                        data-testid={`task-${index}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                task.taskType === 'heavy' ? 'destructive' : 
                                task.taskType === 'medium' ? 'secondary' : 
                                'default'
                              }>
                                {task.taskType === 'heavy' ? '심화' : task.taskType === 'medium' ? '중급' : '기본'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(task.date), 'yyyy-MM-dd')}
                              </span>
                            </div>
                            <p className="font-medium text-sm">{task.testName} - {task.sectionName}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.task}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  };

  const renderSpecial = () => {
    const dataToShow = showHistory ? specialAttentionHistory : specialAttention;

    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                특별 관리 대상
              </h2>
              <p className="text-muted-foreground">
                70점 미만 학생들의 대처방안을 입력하고 관리하세요
              </p>
            </div>
            <Button
              variant={showHistory ? "default" : "outline"}
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              {showHistory ? "미처리 목록 보기" : "전체 이력 보기"}
            </Button>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">대기 중</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{specialAttention?.length || 0}</div>
              <div className="text-sm text-muted-foreground">대처방안 미입력 학생</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-muted-foreground">처리 완료</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">
                {(specialAttentionHistory?.length || 0) - (specialAttention?.length || 0)}
              </div>
              <div className="text-sm text-muted-foreground">대처방안 입력 완료</div>
            </CardContent>
          </Card>
        </div>

        {/* Special Attention List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {showHistory ? (
                <>
                  <History className="w-5 h-5" />
                  전체 특별관리 이력
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  대처방안 입력 필요
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!dataToShow || dataToShow.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  {showHistory ? (
                    <History className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">
                  {showHistory ? "특별관리 이력이 없습니다" : "모든 학생의 대처방안이 입력되었습니다"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dataToShow.map((result) => (
                  <div
                    key={result.id}
                    className={`border rounded-lg p-4 ${result.specialNote ? 'border-green-200 bg-green-50/50' : 'border-destructive/30 bg-destructive/5'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="destructive">{result.score}점</Badge>
                          <span className="font-medium">{result.student?.name || '알 수 없음'}</span>
                          <span className="text-sm text-muted-foreground">({result.student?.grade})</span>
                          {result.specialNote && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              처리 완료
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{result.test?.name || '알 수 없음'}</span>
                          <span className="mx-2">•</span>
                          <span>{format(new Date(result.completedAt), 'yyyy-MM-dd HH:mm')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section scores */}
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-2">섹션별 점수:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.sectionScores.map((section, idx) => (
                          <Badge
                            key={idx}
                            variant={section.correct / section.total >= 0.7 ? 'secondary' : 'destructive'}
                          >
                            {idx + 1}섹션: {section.correct}/{section.total}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Special Note Input/Display */}
                    {result.specialNote ? (
                      <div className="bg-white border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-700 mb-1">대처방안:</p>
                        <p className="text-sm">{result.specialNote}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="대처방안을 입력하세요... (예: 개별 보충수업 진행, 학부모 상담 예정 등)"
                          value={specialNoteInput[result.id] || ''}
                          onChange={(e) => setSpecialNoteInput({
                            ...specialNoteInput,
                            [result.id]: e.target.value
                          })}
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleSaveSpecialNote(result.id)}
                            disabled={saveSpecialNoteMutation.isPending}
                          >
                            {saveSpecialNoteMutation.isPending ? '저장 중...' : '대처방안 저장'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSmsSettings = () => (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="w-8 h-8" />
          SMS 문자 설정
        </h2>
        <p className="text-muted-foreground">
          학부모에게 발송되는 성적 알림 문자의 내용을 설정하세요
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); saveSmsSettingsMutation.mutate(smsSettingsForm); }} className="max-w-4xl space-y-6">
        {/* 학원 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>학원 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium mb-2">학원명</label>
              <Input
                value={smsSettingsForm.academyName}
                onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, academyName: e.target.value })}
                placeholder="학원명을 입력하세요"
              />
              <p className="text-xs text-muted-foreground mt-1">문자 발송 시 "[학원명 성적알림]" 형태로 표시됩니다</p>
            </div>
          </CardContent>
        </Card>

        {/* 점수별 메시지 */}
        <Card>
          <CardHeader>
            <CardTitle>점수별 평가 메시지</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">90점 이상</label>
                <Input
                  value={smsSettingsForm.scoreMessage90}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, scoreMessage90: e.target.value })}
                  placeholder="훌륭합니다!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">80점 이상</label>
                <Input
                  value={smsSettingsForm.scoreMessage80}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, scoreMessage80: e.target.value })}
                  placeholder="잘했어요!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">70점 이상</label>
                <Input
                  value={smsSettingsForm.scoreMessage70}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, scoreMessage70: e.target.value })}
                  placeholder="조금만 더 노력하면 완벽해요!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">60점 이상</label>
                <Input
                  value={smsSettingsForm.scoreMessage60}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, scoreMessage60: e.target.value })}
                  placeholder="조금 더 복습이 필요해요."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">60점 미만</label>
                <Input
                  value={smsSettingsForm.scoreMessageBelow}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, scoreMessageBelow: e.target.value })}
                  placeholder="열심히 복습해주세요!"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 파트별 피드백 */}
        <Card>
          <CardHeader>
            <CardTitle>파트별 점수 피드백</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">90% 이상</label>
                <Input
                  value={smsSettingsForm.sectionFeedback90}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, sectionFeedback90: e.target.value })}
                  placeholder="우수"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">80% 이상</label>
                <Input
                  value={smsSettingsForm.sectionFeedback80}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, sectionFeedback80: e.target.value })}
                  placeholder="양호"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">70% 이상</label>
                <Input
                  value={smsSettingsForm.sectionFeedback70}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, sectionFeedback70: e.target.value })}
                  placeholder="보통"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">60% 이상</label>
                <Input
                  value={smsSettingsForm.sectionFeedback60}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, sectionFeedback60: e.target.value })}
                  placeholder="노력"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">60% 미만</label>
                <Input
                  value={smsSettingsForm.sectionFeedbackBelow}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, sectionFeedbackBelow: e.target.value })}
                  placeholder="복습필요"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 과제 유형명 */}
        <Card>
          <CardHeader>
            <CardTitle>과제 유형명</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">0-2개 오답</label>
                <Input
                  value={smsSettingsForm.taskTypeLight}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, taskTypeLight: e.target.value })}
                  placeholder="기본"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">3-4개 오답</label>
                <Input
                  value={smsSettingsForm.taskTypeMedium}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, taskTypeMedium: e.target.value })}
                  placeholder="보충"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">5개 이상 오답</label>
                <Input
                  value={smsSettingsForm.taskTypeHeavy}
                  onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, taskTypeHeavy: e.target.value })}
                  placeholder="심화"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 기본 과제 내용 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 과제 내용</CardTitle>
            <p className="text-sm text-muted-foreground">테스트별 과제가 설정되지 않았을 때 사용됩니다</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">0-2개 오답 과제</label>
              <Textarea
                value={smsSettingsForm.defaultTaskLight}
                onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, defaultTaskLight: e.target.value })}
                placeholder="시험지에 오답문제 정리해오기"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">3-4개 오답 과제</label>
              <Textarea
                value={smsSettingsForm.defaultTaskMedium}
                onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, defaultTaskMedium: e.target.value })}
                placeholder="수업노트 필기 다시하고 오답문제 정리하기"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">5개 이상 오답 과제</label>
              <Textarea
                value={smsSettingsForm.defaultTaskHeavy}
                onChange={(e) => setSmsSettingsForm({ ...smsSettingsForm, defaultTaskHeavy: e.target.value })}
                placeholder="동영상 수업 내용복습, 수업노트 필기, 오답정리해오기"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* 미리보기 */}
        <Card>
          <CardHeader>
            <CardTitle>문자 미리보기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
{`[${smsSettingsForm.academyName} 성적알림]

홍길동 학생
1주차 통합과학 결과

12/31 테스트 결과
총점: 70점
정답: 21/30문항
${smsSettingsForm.scoreMessage70}

[파트별 성적]
세포의 구조: 8/10 (${smsSettingsForm.sectionFeedback80})
세포 분열: 7/10 (${smsSettingsForm.sectionFeedback70})
DNA 구조: 6/10 (${smsSettingsForm.sectionFeedback60})

[보충 과제]
세포의 구조(${smsSettingsForm.taskTypeLight}): ${smsSettingsForm.defaultTaskLight}
세포 분열(${smsSettingsForm.taskTypeMedium}): ${smsSettingsForm.defaultTaskMedium}
DNA 구조(${smsSettingsForm.taskTypeHeavy}): ${smsSettingsForm.defaultTaskHeavy}

문의: ${smsSettingsForm.academyName}`}
            </div>
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <Button
          type="submit"
          className="w-full"
          disabled={saveSmsSettingsMutation.isPending}
        >
          {saveSmsSettingsMutation.isPending ? '저장 중...' : 'SMS 설정 저장'}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <Navigation isAdmin />
      
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <header className="md:hidden bg-card border-b border-border sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-bold text-foreground">관리자</h1>
            <div className="flex space-x-1 overflow-x-auto">
              {(['dashboard', 'students', 'tests', 'test-manage', 'results', 'analysis', 'special', 'sms'] as AdminView[]).map((view) => (
                <Button
                  key={view}
                  variant={currentView === view ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView(view)}
                  className="text-xs whitespace-nowrap"
                >
                  {view === 'dashboard' ? '대시보드' :
                   view === 'students' ? '학생' :
                   view === 'tests' ? '테스트생성' :
                   view === 'test-manage' ? '테스트관리' :
                   view === 'results' ? '성적' :
                   view === 'analysis' ? '분석' :
                   view === 'special' ? '특별관리' : 'SMS설정'}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {/* Desktop Tabs */}
        <div className="hidden md:block border-b border-border">
          <div className="flex space-x-8 px-8 pt-4">
            {(['dashboard', 'students', 'tests', 'test-manage', 'results', 'analysis', 'special', 'sms'] as AdminView[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  currentView === view
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                } ${view === 'special' ? 'text-destructive' : ''}`}
                data-testid={`tab-${view}`}
              >
                {view === 'dashboard' ? '대시보드' :
                 view === 'students' ? '학생 관리' :
                 view === 'tests' ? '테스트 생성' :
                 view === 'test-manage' ? '테스트 관리' :
                 view === 'results' ? '성적 조회' :
                 view === 'analysis' ? '학생별 분석' :
                 view === 'special' ? '특별관리' : 'SMS설정'}
              </button>
            ))}
          </div>
        </div>

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'students' && renderStudents()}
        {currentView === 'tests' && renderTests()}
        {currentView === 'test-manage' && renderTestManage()}
        {currentView === 'results' && renderResults()}
        {currentView === 'analysis' && renderAnalysis()}
        {currentView === 'special' && renderSpecial()}
        {currentView === 'sms' && renderSmsSettings()}
      </main>

      <Navigation />
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Student, Test, TestResult, GradeLevel } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

type AdminView = 'dashboard' | 'students' | 'tests' | 'results' | 'analysis';

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

  // Fetch data
  const { data: students } = useQuery<Student[]>({ queryKey: ['/api/students'] });
  const { data: tests } = useQuery<Test[]>({ queryKey: ['/api/tests'] });
  const { data: testResults } = useQuery<TestResult[]>({ queryKey: ['/api/test-results'] });

  // Student management
  const [studentForm, setStudentForm] = useState({
    studentId: '',
    name: '',
    grade: '' as GradeLevel | '',
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
          heavy: '동영상수업 내용복습이후고 수업노트필기 1번필기하고 오답문제들에 알가나뭍 적어오기' 
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
          heavy: '동영상수업 내용복습이후고 수업노트필기 1번필기하고 오답문제들에 알가나뭍 적어오기' 
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
          heavy: '동영상수업 내용복습이후고 수업노트필기 1번필기하고 오답문제들에 알가나뭍 적어오기' 
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
      setStudentForm({ studentId: '', name: '', grade: '' });
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
      setStudentForm({ studentId: '', name: '', grade: '' });
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
            heavy: '동영상수업 내용복습이후고 수업노트필기 1번필기하고 오답문제들에 알가나뭍 적어오기' 
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
            heavy: '동영상수업 내용복습이후고 수업노트필기 1번필기하고 오답문제들에 알가나뭍 적어오기' 
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
            heavy: '동영상수업 내용복습이후고 수업노트필기 1번필기하고 오답문제들에 알가나뭍 적어오기' 
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
    });
    setStudentModalOpen(true);
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
      <Card>
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
              {testResults?.slice(0, 5).map((result: TestResult) => {
                const student = students?.find((s: Student) => s.id === result.studentId);
                const test = tests?.find((t: Test) => t.id === result.testId);
                
                return (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{student?.name || '알 수 없음'}</TableCell>
                    <TableCell>{test?.name || '알 수 없음'}</TableCell>
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
    </div>
  );

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
                      setStudentForm({ studentId: '', name: '', grade: '' });
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

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생 ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>학년</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students?.map((student: Student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
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
                    <SelectItem value="통합과학 중1">통합과학 중1</SelectItem>
                    <SelectItem value="통합과학 중2">통합과학 중2</SelectItem>
                    <SelectItem value="통합과학 중3">통합과학 중3</SelectItem>
                    <SelectItem value="화학">화학</SelectItem>
                    <SelectItem value="생물">생물</SelectItem>
                    <SelectItem value="물리">물리</SelectItem>
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
        <h3 className="text-2xl font-bold text-foreground mb-4">등록된 테스트</h3>
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
                {tests && tests.length > 0 ? (
                  tests.map((test: Test) => (
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
                            onClick={() => handleEditTest(test)}
                            data-testid={`edit-test-${test.id}`}
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
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      등록된 테스트가 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">성적 조회</h2>
        <p className="text-muted-foreground">학생별, 테스트별로 성적을 조회하고 출력할 수 있습니다</p>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>학생</TableHead>
                <TableHead>테스트</TableHead>
                <TableHead>점수</TableHead>
                <TableHead>오답 수</TableHead>
                <TableHead>과제 유형</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testResults?.map((result: TestResult) => {
                const student = students?.find((s: Student) => s.id === result.studentId);
                const test = tests?.find((t: Test) => t.id === result.testId);
                const totalErrors = result.sectionScores.reduce((sum, section) => sum + section.wrongAnswers.length, 0);
                const maxTaskType = result.assignedTasks.reduce((max, task) => 
                  task.taskType === 'heavy' ? 'heavy' : 
                  task.taskType === 'medium' && max !== 'heavy' ? 'medium' : 
                  max === '' ? 'light' : max, '');
                
                return (
                  <TableRow key={result.id}>
                    <TableCell>{new Date(result.completedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{student?.name || '알 수 없음'}</TableCell>
                    <TableCell>{test?.name || '알 수 없음'}</TableCell>
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
    </div>
  );

  const renderAnalysis = () => {
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">학생 선택</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger data-testid="select-student-analysis">
                    <SelectValue placeholder="학생을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student: Student) => (
                      <SelectItem key={student.id} value={student.id}>
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

  return (
    <div className="flex h-screen bg-background">
      <Navigation isAdmin />
      
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <header className="md:hidden bg-card border-b border-border sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-bold text-foreground">관리자</h1>
            <div className="flex space-x-1 overflow-x-auto">
              {(['dashboard', 'students', 'tests', 'results', 'analysis'] as AdminView[]).map((view) => (
                <Button
                  key={view}
                  variant={currentView === view ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView(view)}
                  className="text-xs whitespace-nowrap"
                >
                  {view === 'dashboard' ? '대시보드' : 
                   view === 'students' ? '학생' :
                   view === 'tests' ? '테스트' : 
                   view === 'results' ? '성적' : '분석'}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {/* Desktop Tabs */}
        <div className="hidden md:block border-b border-border">
          <div className="flex space-x-8 px-8 pt-4">
            {(['dashboard', 'students', 'tests', 'results', 'analysis'] as AdminView[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  currentView === view
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`tab-${view}`}
              >
                {view === 'dashboard' ? '대시보드' : 
                 view === 'students' ? '학생 관리' :
                 view === 'tests' ? '테스트 생성' : 
                 view === 'results' ? '성적 조회' : '학생별 분석'}
              </button>
            ))}
          </div>
        </div>

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'students' && renderStudents()}
        {currentView === 'tests' && renderTests()}
        {currentView === 'results' && renderResults()}
        {currentView === 'analysis' && renderAnalysis()}
      </main>

      <Navigation />
    </div>
  );
}

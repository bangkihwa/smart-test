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
import { BarChart3 } from "lucide-react";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Student, Test, TestResult, GradeLevel } from "@/lib/types";

type AdminView = 'dashboard' | 'students' | 'tests' | 'results';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Fetch data
  const { data: students } = useQuery({ queryKey: ['/api/students'] });
  const { data: tests } = useQuery({ queryKey: ['/api/tests'] });
  const { data: testResults } = useQuery({ queryKey: ['/api/test-results'] });

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
        assignments: { light: '', medium: '', heavy: '' }
      },
      {
        sectionNumber: 2,
        name: '',
        coreContent: '',
        answers: new Array(10).fill(1),
        assignments: { light: '', medium: '', heavy: '' }
      },
      {
        sectionNumber: 3,
        name: '',
        coreContent: '',
        answers: new Array(10).fill(1),
        assignments: { light: '', medium: '', heavy: '' }
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
      // Reset form
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
            assignments: { light: '', medium: '', heavy: '' }
          },
          {
            sectionNumber: 2,
            name: '',
            coreContent: '',
            answers: new Array(10).fill(1),
            assignments: { light: '', medium: '', heavy: '' }
          },
          {
            sectionNumber: 3,
            name: '',
            coreContent: '',
            answers: new Array(10).fill(1),
            assignments: { light: '', medium: '', heavy: '' }
          }
        ]
      });
    },
    onError: (error: any) => {
      console.error('Test creation error:', error);
      toast({ 
        title: "테스트 생성 실패", 
        description: error.message || "다시 시도해주세요.",
        variant: "destructive" 
      });
    },
  });

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
    
    // Validate subject and grade
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
    
    createTestMutation.mutate(testForm);
  };

  const updateTestSection = (sectionIndex: number, field: string, value: any) => {
    const newSections = [...testForm.sections];
    if (field.startsWith('assignments.')) {
      const assignmentType = field.split('.')[1];
      newSections[sectionIndex].assignments = {
        ...newSections[sectionIndex].assignments,
        [assignmentType]: value,
      };
    } else {
      (newSections[sectionIndex] as any)[field] = value;
    }
    setTestForm({ ...testForm, sections: newSections });
  };

  const updateAnswer = (sectionIndex: number, questionIndex: number, answer: number) => {
    const newSections = [...testForm.sections];
    newSections[sectionIndex].answers[questionIndex] = answer;
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
        <h2 className="text-3xl font-bold text-foreground mb-2">테스트 생성</h2>
        <p className="text-muted-foreground">새로운 테스트를 생성하고 문항을 입력하세요</p>
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
                  required
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
                required
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
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">핵심 내용</label>
                <Textarea
                  value={section.coreContent}
                  onChange={(e) => updateTestSection(sectionIndex, 'coreContent', e.target.value)}
                  placeholder="이 섹션의 핵심 개념을 입력하세요..."
                  rows={3}
                  required
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
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">3-4개 오답</label>
                    <Input
                      value={section.assignments.medium}
                      onChange={(e) => updateTestSection(sectionIndex, 'assignments.medium', e.target.value)}
                      placeholder="핵심 개념 정리 + 유사 문제 풀이"
                      className="text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">5개 이상 오답</label>
                    <Input
                      value={section.assignments.heavy}
                      onChange={(e) => updateTestSection(sectionIndex, 'assignments.heavy', e.target.value)}
                      placeholder="전체 개념 재학습 + 심화 과제"
                      className="text-sm"
                      required
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
            disabled={createTestMutation.isPending}
            data-testid="save-test-button"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {createTestMutation.isPending ? '저장 중...' : '테스트 저장'}
          </Button>
          <Button type="button" variant="outline" className="px-6">
            취소
          </Button>
        </div>
      </form>
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

  return (
    <div className="flex h-screen bg-background">
      <Navigation isAdmin />
      
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <header className="md:hidden bg-card border-b border-border sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-bold text-foreground">관리자</h1>
            <div className="flex space-x-2">
              {(['dashboard', 'students', 'tests', 'results'] as AdminView[]).map((view) => (
                <Button
                  key={view}
                  variant={currentView === view ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView(view)}
                  className="text-xs"
                >
                  {view === 'dashboard' ? '대시보드' : 
                   view === 'students' ? '학생' :
                   view === 'tests' ? '테스트' : '성적'}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {/* Desktop Tabs */}
        <div className="hidden md:block border-b border-border">
          <div className="flex space-x-8 px-8 pt-4">
            {(['dashboard', 'students', 'tests', 'results'] as AdminView[]).map((view) => (
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
                 view === 'tests' ? '테스트 생성' : '성적 조회'}
              </button>
            ))}
          </div>
        </div>

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'students' && renderStudents()}
        {currentView === 'tests' && renderTests()}
        {currentView === 'results' && renderResults()}
      </main>

      <Navigation />
    </div>
  );
}

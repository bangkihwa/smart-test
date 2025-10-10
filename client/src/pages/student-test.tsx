import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import OMRInput from "@/components/omr-input";
import StudentDashboard from "./student-dashboard";
import type { Test, Student } from "@/lib/types";
import { queryClient, apiRequest } from "@/lib/queryClient";
import logoImg from "@assets/403e7f94-9ba8-4bcc-b0ee-9d85daaea925_1760051026579.jpg";

type ViewState = 'login' | 'dashboard' | 'test-selection' | 'omr-input' | 'loading';

export default function StudentTest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [viewState, setViewState] = useState<ViewState>('login');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [student, setStudent] = useState<Student | null>(null);

  // Fetch available tests
  const { data: tests, isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
    enabled: viewState === 'test-selection',
  });

  // Student login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ studentId, name, grade }: { studentId: string, name: string, grade: string }) => {
      const response = await apiRequest('POST', '/api/students/login', {
        studentId,
        name,
        grade,
      });
      return await response.json();
    },
    onSuccess: (student: Student) => {
      setStudent(student);
      setViewState('dashboard');
      toast({
        title: "로그인 성공",
        description: `${student.name}님, 환영합니다!`,
      });
    },
    onError: (error: any) => {
      // Extract error message from Error object
      let errorMessage = "다시 시도해주세요.";
      
      if (error.message) {
        // error.message format: "409: {json body}"
        const match = error.message.match(/^\d+:\s*(.+)$/);
        if (match) {
          try {
            const errorData = JSON.parse(match[1]);
            errorMessage = errorData.message || errorMessage;
            
            // If mismatch error, show stored info
            if (errorData.storedName && errorData.storedGrade) {
              errorMessage = `${errorData.message}\n등록된 정보: ${errorData.storedName} (${errorData.storedGrade})`;
            }
          } catch {
            // If can't parse JSON, use the whole message after status code
            errorMessage = match[1] || errorMessage;
          }
        }
      }
      
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: errorMessage,
      });
    },
  });

  // Test submission mutation
  const submitTestMutation = useMutation({
    mutationFn: async ({ studentId, testId, answers }: { 
      studentId: string, 
      testId: string, 
      answers: number[] 
    }) => {
      const response = await apiRequest('POST', '/api/test-results/submit', {
        studentId,
        testId,
        answers,
      });
      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-results'] });
      toast({
        title: "테스트 제출 완료",
        description: "채점이 완료되었습니다.",
      });
      setLocation(`/results/${result.id}`);
    },
    onError: () => {
      setViewState('omr-input');
      toast({
        variant: "destructive",
        title: "제출 실패",
        description: "다시 시도해주세요.",
      });
    },
  });

  const handleLogin = () => {
    if (!studentId.trim()) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "학생 ID를 입력해주세요.",
      });
      return;
    }
    if (!studentName.trim()) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "이름을 입력해주세요.",
      });
      return;
    }
    if (!studentGrade) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "학년을 선택해주세요.",
      });
      return;
    }
    
    // Login via API (will create student if doesn't exist)
    loginMutation.mutate({
      studentId: studentId.trim(),
      name: studentName.trim(),
      grade: studentGrade,
    });
  };

  const handleTestSelect = (test: Test) => {
    setSelectedTest(test);
    setViewState('omr-input');
  };

  const handleTestSubmit = (answers: number[]) => {
    if (!student || !selectedTest) return;
    
    setViewState('loading');
    submitTestMutation.mutate({
      studentId: student.studentId,
      testId: selectedTest.testId,
      answers,
    });
  };

  const handleBackToSelection = () => {
    setSelectedTest(null);
    setViewState('test-selection');
  };

  const handleStartTest = () => {
    setViewState('test-selection');
  };

  const handleBackToDashboard = () => {
    setSelectedTest(null);
    setViewState('dashboard');
  };

  if (viewState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg p-8 flex flex-col items-center space-y-4 shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-foreground font-medium">채점 중...</p>
        </div>
      </div>
    );
  }

  if (viewState === 'dashboard' && student) {
    return (
      <>
        <StudentDashboard
          student={student}
          onStartTest={handleStartTest}
        />
        <Navigation />
      </>
    );
  }

  if (viewState === 'omr-input' && selectedTest) {
    return (
      <div className="min-h-screen bg-background">
        <OMRInput
          test={selectedTest}
          onSubmit={handleTestSubmit}
          onBack={handleBackToSelection}
        />
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logoImg} 
                alt="목동에이원과학학원" 
                className="h-10 w-auto"
                data-testid="logo-header"
              />
              <div>
                <h1 className="text-base font-bold text-foreground">목동에이원과학학원</h1>
                <p className="text-xs text-muted-foreground">과제테스트 시스템</p>
              </div>
            </div>
            {student && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">{student.name}</span>
                <span className="text-xs text-muted-foreground">{student.grade}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 pb-24">
        {viewState === 'login' && (
          <div className="max-w-md mx-auto pt-12">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <img 
                  src={logoImg} 
                  alt="목동에이원과학학원" 
                  className="w-32 h-auto mx-auto mb-4"
                  data-testid="logo-login"
                />
                <CardTitle className="text-2xl font-bold text-foreground mb-2">학생 테스트</CardTitle>
                <p className="text-muted-foreground">학생 정보를 입력하세요</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">학생 ID</label>
                  <Input
                    type="text"
                    placeholder="학생 ID 입력"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    data-testid="student-id-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">이름</label>
                  <Input
                    type="text"
                    placeholder="이름 입력"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    data-testid="student-name-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">학년</label>
                  <Select value={studentGrade} onValueChange={setStudentGrade}>
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

                <Button
                  onClick={handleLogin}
                  className="w-full bg-primary text-primary-foreground font-medium py-3"
                  data-testid="login-button"
                >
                  다음
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {viewState === 'test-selection' && (
          <div>
            <div className="mb-4">
              <Button
                onClick={handleBackToDashboard}
                variant="ghost"
                className="mb-2"
                data-testid="back-to-dashboard"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                대시보드로 돌아가기
              </Button>
            </div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">과제 테스트 선택</h2>
              <p className="text-muted-foreground">풀이한 단원을 선택하고 답을 입력하세요</p>
            </div>

            {testsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card rounded-lg border border-border p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {tests?.filter(test => !test.grade || test.grade === student?.grade).map((test: Test) => (
                  <Card 
                    key={test.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleTestSelect(test)}
                    data-testid={`test-card-${test.testId}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {test.subject}
                            </span>
                            <span className="text-xs text-muted-foreground">총 30문항</span>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">{test.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {test.sections.map((section, index) => 
                              `${section.name} (${(section.sectionNumber - 1) * 10 + 1}-${section.sectionNumber * 10}번)`
                            ).join(', ')}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-muted-foreground mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}

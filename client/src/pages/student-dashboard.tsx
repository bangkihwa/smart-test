import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { Calendar as CalendarIcon, FileText } from "lucide-react";
import type { Student, TestResult, Test } from "@/lib/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import logoImg from "@assets/403e7f94-9ba8-4bcc-b0ee-9d85daaea925_1760051026579.jpg";

interface StudentDashboardProps {
  student: Student;
  onStartTest: () => void;
  onLogout: () => void;
}

export default function StudentDashboard({ student, onStartTest, onLogout }: StudentDashboardProps) {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showReport, setShowReport] = useState(false);

  // Fetch student's test results
  const { data: testResults, isLoading } = useQuery<TestResult[]>({
    queryKey: ['/api/test-results', 'student', student.studentId],
    queryFn: async () => {
      const response = await fetch(`/api/test-results/student/${student.studentId}`);
      if (!response.ok) throw new Error('Failed to fetch results');
      return response.json();
    },
  });

  // Fetch all tests to get test details
  const { data: tests } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
    queryFn: async () => {
      const response = await fetch('/api/tests');
      if (!response.ok) throw new Error('Failed to fetch tests');
      return response.json();
    },
  });

  // Calculate statistics
  const stats = testResults ? {
    totalTests: testResults.length,
    averageScore: testResults.length > 0
      ? Math.round(testResults.reduce((sum, r) => sum + r.score, 0) / testResults.length)
      : 0,
    latestScore: testResults.length > 0 ? testResults[0].score : 0,
  } : { totalTests: 0, averageScore: 0, latestScore: 0 };

  // Prepare chart data (최근 10개)
  const chartData = testResults
    ?.slice(0, 10)
    .reverse()
    .map((result, index) => ({
      name: `${index + 1}회`,
      점수: result.score,
      date: format(new Date(result.completedAt), 'MM/dd'),
    })) || [];

  // Collect all pending tasks
  const allTasks = testResults?.flatMap(result =>
    result.assignedTasks.map(task => ({
      testResultId: result.id,
      completedAt: result.completedAt,
      sectionNumber: task.sectionNumber,
      taskType: task.taskType,
      task: task.task,
    }))
  ) || [];

  // Filter results by date range
  const filteredResults = testResults?.filter(result => {
    const resultDate = new Date(result.completedAt);
    if (dateRange.from && resultDate < dateRange.from) return false;
    if (dateRange.to) {
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      if (resultDate > endOfDay) return false;
    }
    return true;
  }) || [];

  // Analyze filtered results for report
  const reportData = filteredResults.length > 0 ? (() => {
    // Section accuracy analysis
    const sectionStats: Record<number, { correct: number; total: number; tasks: string[] }> = {};
    
    filteredResults.forEach(result => {
      result.sectionScores.forEach(section => {
        if (!sectionStats[section.sectionNumber]) {
          sectionStats[section.sectionNumber] = { correct: 0, total: 0, tasks: [] };
        }
        sectionStats[section.sectionNumber].correct += section.correct;
        sectionStats[section.sectionNumber].total += section.total;
      });

      result.assignedTasks.forEach(task => {
        // Initialize section if it doesn't exist (edge case: task without score entry)
        if (!sectionStats[task.sectionNumber]) {
          sectionStats[task.sectionNumber] = { correct: 0, total: 0, tasks: [] };
        }
        if (!sectionStats[task.sectionNumber].tasks.includes(task.task)) {
          sectionStats[task.sectionNumber].tasks.push(task.task);
        }
      });
    });

    // Calculate accuracy percentages
    const sectionAccuracy = Object.entries(sectionStats).map(([sectionNum, stats]) => {
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      const wrongCount = stats.total - stats.correct;
      
      return {
        sectionNumber: parseInt(sectionNum),
        accuracy: Math.round(accuracy),
        correct: stats.correct,
        total: stats.total,
        wrongCount,
        tasks: stats.tasks,
      };
    }).sort((a, b) => a.sectionNumber - b.sectionNumber);

    // Find weakest section (lowest accuracy)
    const weakestSection = sectionAccuracy.reduce((min, section) =>
      section.accuracy < min.accuracy ? section : min
    , sectionAccuracy[0]);

    // Get test details for weakest section
    const weakestSectionDetails = tests?.flatMap(test =>
      test.sections.filter(s => s.sectionNumber === weakestSection?.sectionNumber)
    )[0];

    return {
      totalTests: filteredResults.length,
      averageScore: Math.round(filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length),
      sectionAccuracy,
      weakestSection,
      weakestSectionDetails,
      scoreData: filteredResults
        .slice()
        .reverse()
        .map((result, index) => ({
          name: format(new Date(result.completedAt), 'MM/dd', { locale: ko }),
          점수: result.score,
        })),
    };
  })() : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logoImg} 
                alt="목동에이원과학학원" 
                className="h-10 w-auto"
                data-testid="logo-dashboard"
              />
              <div>
                <h1 className="text-base font-bold text-foreground">{student.name}</h1>
                <p className="text-xs text-muted-foreground">{student.grade}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                data-testid="logout-button"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </Button>
              <Button
                onClick={onStartTest}
                className="bg-primary text-primary-foreground"
                data-testid="start-new-test"
              >
                새 테스트
              </Button>
            </div>
          </div>

          {/* Date Range and Report */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-start text-left font-normal"
                  data-testid="select-date-range"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MM/dd", { locale: ko })} -{" "}
                        {format(dateRange.to, "MM/dd", { locale: ko })}
                      </>
                    ) : (
                      format(dateRange.from, "MM/dd", { locale: ko })
                    )
                  ) : (
                    <span>기간 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={1}
                  locale={ko}
                  data-testid="date-range-calendar"
                />
              </PopoverContent>
            </Popover>

            {dateRange.from && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange({})}
                data-testid="clear-date-range"
              >
                초기화
              </Button>
            )}

            <Button
              size="sm"
              variant="default"
              onClick={() => setShowReport(true)}
              disabled={!filteredResults || filteredResults.length === 0}
              data-testid="generate-report"
            >
              <FileText className="mr-1 h-4 w-4" />
              리포트
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalTests}</div>
              <div className="text-xs text-muted-foreground mt-1">총 테스트</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.averageScore}점</div>
              <div className="text-xs text-muted-foreground mt-1">평균 점수</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.latestScore}점</div>
              <div className="text-xs text-muted-foreground mt-1">최근 점수</div>
            </CardContent>
          </Card>
        </div>

        {/* Score Trend Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">성적 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="점수"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pending Tasks - 강조 */}
        {allTasks.length > 0 && (
          <Card className="border-2 border-primary shadow-lg">
            <CardHeader className="bg-primary/10">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <CardTitle className="text-lg text-primary">추가 과제 ({allTasks.length}개)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {allTasks.map((task, index) => (
                <div
                  key={index}
                  className="p-4 bg-muted rounded-lg border border-border hover:shadow-md transition-shadow"
                  data-testid={`task-item-${index}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          task.taskType === 'heavy' ? 'destructive' :
                          task.taskType === 'medium' ? 'default' :
                          'secondary'
                        }
                      >
                        {task.taskType === 'heavy' ? '상' :
                         task.taskType === 'medium' ? '중' : '하'}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        섹션 {task.sectionNumber}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(task.completedAt), 'MM/dd')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{task.task}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Test Results List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : testResults && testResults.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">테스트 결과 목록</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {testResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => setLocation(`/results/${result.id}`)}
                  className="p-4 bg-muted rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  data-testid={`result-item-${result.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {format(new Date(result.completedAt), 'yyyy년 MM월 dd일')}
                    </span>
                    <Badge variant={result.score >= 80 ? 'default' : result.score >= 60 ? 'secondary' : 'destructive'}>
                      {result.score}점
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>섹션 {result.sectionScores.length}개</span>
                    <span>•</span>
                    <span>과제 {result.assignedTasks.length}개</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium mb-2">아직 테스트 결과가 없습니다</p>
                <p className="text-sm">첫 테스트를 시작해보세요!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              학습 리포트
              {dateRange.from && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({format(dateRange.from, "yyyy.MM.dd", { locale: ko })}
                  {dateRange.to && ` - ${format(dateRange.to, "yyyy.MM.dd", { locale: ko })}`})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {reportData && (
            <div className="space-y-6 py-4" data-testid="report-content">
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{reportData.totalTests}</div>
                    <div className="text-sm text-muted-foreground mt-1">총 테스트</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{reportData.averageScore}점</div>
                    <div className="text-sm text-muted-foreground mt-1">평균 점수</div>
                  </CardContent>
                </Card>
              </div>

              {/* Score Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">기간별 점수 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={reportData.scoreData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="점수"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Section Accuracy */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">단원별 정확도</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={reportData.sectionAccuracy}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sectionNumber" tickFormatter={(v) => `섹션 ${v}`} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, '정확도']}
                        labelFormatter={(label) => `섹션 ${label}`}
                      />
                      <Bar
                        dataKey="accuracy"
                        fill="hsl(var(--primary))"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4 space-y-2">
                    {reportData.sectionAccuracy.map((section) => (
                      <div
                        key={section.sectionNumber}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        data-testid={`section-stats-${section.sectionNumber}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">섹션 {section.sectionNumber}</Badge>
                          <span className="text-sm">
                            정답: {section.correct}/{section.total}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${section.accuracy >= 80 ? 'text-green-600' : section.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {section.accuracy}%
                          </span>
                          {section.wrongCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              오답 {section.wrongCount}개
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Weakest Section - 취약 단원 */}
              {reportData.weakestSection && (
                <Card className="border-2 border-destructive/50">
                  <CardHeader className="bg-destructive/10">
                    <CardTitle className="text-base text-destructive flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      가장 취약한 단원
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">섹션 {reportData.weakestSection.sectionNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          정확도: <span className="text-destructive font-medium">{reportData.weakestSection.accuracy}%</span>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-lg px-4 py-2">
                        오답 {reportData.weakestSection.wrongCount}개
                      </Badge>
                    </div>

                    {reportData.weakestSectionDetails && (
                      <div className="space-y-3">
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <h4 className="font-medium text-sm mb-2 text-primary">핵심 내용</h4>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {reportData.weakestSectionDetails.coreContent}
                          </p>
                        </div>

                        {reportData.weakestSection.tasks.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">추가 과제</h4>
                            <div className="space-y-2">
                              {reportData.weakestSection.tasks.map((task, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-muted rounded-lg border border-border"
                                  data-testid={`weak-section-task-${idx}`}
                                >
                                  <p className="text-sm whitespace-pre-wrap">{task}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* All Tasks Summary */}
              {reportData.sectionAccuracy.some(s => s.tasks.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">전체 추가 과제</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reportData.sectionAccuracy
                      .filter(s => s.tasks.length > 0)
                      .map((section) => (
                        <div key={section.sectionNumber} className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">섹션 {section.sectionNumber}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {section.tasks.length}개 과제
                            </span>
                          </div>
                          {section.tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className="ml-4 p-3 bg-muted rounded-lg border border-border"
                              data-testid={`report-task-${section.sectionNumber}-${idx}`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{task}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useLocation } from "wouter";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { Calendar as CalendarIcon, FileText } from "lucide-react";
import type { Student, TestResult, Test } from "@/lib/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import logoImg from "@assets/403e7f94-9ba8-4bcc-b0ee-9d85daaea925_1760051026579.jpg";

// 색상 팔레트
const CHART_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#06b6d4'];
const DIFFICULTY_COLORS = { easy: '#22c55e', medium: '#3b82f6', hard: '#f59e0b', veryHard: '#ef4444' };

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

  // Collect all pending tasks (최근 2주 이내만 표시)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const allTasks = testResults?.flatMap(result => {
    const resultDate = new Date(result.completedAt);
    // 2주 이내의 테스트 결과만 포함
    if (resultDate < twoWeeksAgo) return [];

    return result.assignedTasks.map(task => ({
      testResultId: result.id,
      completedAt: result.completedAt,
      sectionNumber: task.sectionNumber,
      taskType: task.taskType,
      task: task.task,
    }));
  }) || [];

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
    // Section accuracy analysis - 단원별로 그룹화 (단원 이름 기준)
    const sectionStats: Record<string, {
      correct: number;
      total: number;
      tasks: string[];
      sectionNumber: number;
      testName: string;
    }> = {};

    filteredResults.forEach(result => {
      // 해당 테스트의 섹션 정보 가져오기
      const test = tests?.find(t => t.id === result.testId);

      result.sectionScores.forEach(section => {
        // 테스트에서 해당 섹션의 이름 찾기
        const testSection = test?.sections.find(s => s.sectionNumber === section.sectionNumber);
        const sectionName = testSection?.name || `섹션 ${section.sectionNumber}`;
        const key = `${sectionName}`; // 단원 이름을 키로 사용

        if (!sectionStats[key]) {
          sectionStats[key] = {
            correct: 0,
            total: 0,
            tasks: [],
            sectionNumber: section.sectionNumber,
            testName: test?.name || ''
          };
        }
        sectionStats[key].correct += section.correct;
        sectionStats[key].total += section.total;
      });

      result.assignedTasks.forEach(task => {
        const testSection = test?.sections.find(s => s.sectionNumber === task.sectionNumber);
        const sectionName = testSection?.name || `섹션 ${task.sectionNumber}`;
        const key = `${sectionName}`;

        if (!sectionStats[key]) {
          sectionStats[key] = {
            correct: 0,
            total: 0,
            tasks: [],
            sectionNumber: task.sectionNumber,
            testName: test?.name || ''
          };
        }
        if (!sectionStats[key].tasks.includes(task.task)) {
          sectionStats[key].tasks.push(task.task);
        }
      });
    });

    // Calculate accuracy percentages
    const sectionAccuracy = Object.entries(sectionStats).map(([sectionName, stats]) => {
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      const wrongCount = stats.total - stats.correct;

      return {
        sectionName, // 단원 이름
        sectionNumber: stats.sectionNumber,
        testName: stats.testName,
        accuracy: Math.round(accuracy),
        correct: stats.correct,
        total: stats.total,
        wrongCount,
        tasks: stats.tasks,
      };
    }).sort((a, b) => a.sectionNumber - b.sectionNumber);

    // Find weakest section (lowest accuracy)
    const weakestSection = sectionAccuracy.length > 0
      ? sectionAccuracy.reduce((min, section) =>
          section.accuracy < min.accuracy ? section : min
        , sectionAccuracy[0])
      : null;

    // Get test details for weakest section
    const weakestSectionDetails = weakestSection
      ? tests?.flatMap(test =>
          test.sections.filter(s => s.name === weakestSection.sectionName)
        )[0]
      : null;

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

      {/* Report Dialog - 새로운 디자인 */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #faf5ff 50%, #f0f9ff 100%)' }}>
          {reportData && (
            <div className="p-6 space-y-6" data-testid="report-content">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">
                    <span className="text-gray-800">{student.name}</span>
                    {' '}
                    <span className="text-pink-500">학습분석</span>
                  </h1>
                  <p className="text-gray-500 mt-1">
                    {dateRange.from ? (
                      <>
                        {format(dateRange.from, "yyyy년 MM월 dd일", { locale: ko })}
                        {dateRange.to && ` - ${format(dateRange.to, "yyyy년 MM월 dd일", { locale: ko })}`}
                      </>
                    ) : '전체 기간'} 분석 리포트
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold" style={{ color: reportData.averageScore >= 80 ? DIFFICULTY_COLORS.easy : reportData.averageScore >= 60 ? DIFFICULTY_COLORS.medium : DIFFICULTY_COLORS.hard }}>
                    {reportData.averageScore >= 80 ? '상' : reportData.averageScore >= 60 ? '중' : '하'}
                  </div>
                  <p className="text-sm text-gray-500">학습 수준</p>
                </div>
              </div>

              {/* Summary Badges */}
              <div className="flex flex-wrap gap-3">
                <Badge className="px-4 py-2 text-sm bg-pink-100 text-pink-700 hover:bg-pink-100">
                  📊 총 {reportData.totalTests}회 테스트
                </Badge>
                <Badge className="px-4 py-2 text-sm bg-purple-100 text-purple-700 hover:bg-purple-100">
                  ✓ 평균 {reportData.averageScore}점
                </Badge>
                <Badge className="px-4 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-100">
                  📚 {reportData.sectionAccuracy.length}개 단원 분석
                </Badge>
              </div>

              {/* Main Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white shadow-sm border-0">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-pink-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📝</span>
                    </div>
                    <div className="text-3xl font-bold text-pink-500">{reportData.totalTests}</div>
                    <p className="text-sm text-gray-500">총 테스트</p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-0">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-500">{reportData.averageScore}점</div>
                    <p className="text-sm text-gray-500">평균 점수</p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-0">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="text-3xl font-bold text-green-500">
                      {Math.round(reportData.sectionAccuracy.reduce((sum, s) => sum + s.accuracy, 0) / reportData.sectionAccuracy.length)}%
                    </div>
                    <p className="text-sm text-gray-500">평균 정답률</p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-0">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📈</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-500">
                      {reportData.sectionAccuracy.reduce((sum, s) => sum + s.wrongCount, 0)}
                    </div>
                    <p className="text-sm text-gray-500">총 오답 수</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📊</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800">단원별 분석</h2>
              </div>

              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 단원별 정답률 도넛 차트 */}
                <Card className="bg-white shadow-sm border-0 border-t-4 border-t-pink-400">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-2">단원별 정답 분포</h3>
                    <p className="text-sm text-gray-500 mb-4">각 단원에서의 정답 비율</p>

                    <div className="flex items-center justify-center">
                      <div className="w-48 h-48">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={reportData.sectionAccuracy.map(s => ({ name: s.sectionName, value: s.correct }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {reportData.sectionAccuracy.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="ml-4 space-y-2">
                        {reportData.sectionAccuracy.map((s, i) => (
                          <div key={s.sectionName} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-sm">{s.sectionName}</span>
                            <span className="text-sm font-bold">{s.accuracy}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 단원별 정답률 레이더 차트 */}
                <Card className="bg-white shadow-sm border-0 border-t-4 border-t-purple-400">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-2">단원별 정답률</h3>
                    <p className="text-sm text-gray-500 mb-4">각 단원의 학습 성취도</p>

                    <div className="h-48">
                      <ResponsiveContainer>
                        <RadarChart data={reportData.sectionAccuracy.map(s => ({
                          subject: s.sectionName,
                          정답률: s.accuracy,
                          fullMark: 100,
                        }))}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar
                            name="정답률"
                            dataKey="정답률"
                            stroke="#ec4899"
                            fill="#ec4899"
                            fillOpacity={0.3}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Section Detail Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {reportData.sectionAccuracy.map((section, index) => (
                  <Card key={section.sectionName} className="bg-white shadow-sm border-0 overflow-hidden">
                    <div className="h-1" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold">{section.sectionName}</h4>
                          <p className="text-sm text-gray-500">정답 {section.correct}/{section.total}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>정답률</span>
                          <span className="font-bold" style={{ color: section.accuracy >= 80 ? DIFFICULTY_COLORS.easy : section.accuracy >= 60 ? DIFFICULTY_COLORS.medium : DIFFICULTY_COLORS.hard }}>
                            {section.accuracy}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${section.accuracy}%`,
                              backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                            }}
                          />
                        </div>
                        {section.wrongCount > 0 && (
                          <Badge className="mt-2 bg-red-100 text-red-700 hover:bg-red-100">
                            오답 {section.wrongCount}개
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Score Trend */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📈</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800">점수 추이</h2>
              </div>

              <Card className="bg-white shadow-sm border-0 border-t-4 border-t-blue-400">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-2">기간별 점수 변화</h3>
                  <p className="text-sm text-gray-500 mb-4">테스트별 점수 추이</p>

                  <div className="h-64">
                    <ResponsiveContainer>
                      <LineChart data={reportData.scoreData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="점수"
                          stroke="#ec4899"
                          strokeWidth={3}
                          dot={{ fill: '#ec4899', strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Weakest Section - 취약 단원 */}
              {reportData.weakestSection && reportData.weakestSection.wrongCount > 0 && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">🔥</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">취약 단원 분석 - 집중 학습 필요</h2>
                  </div>

                  <Card className="bg-white shadow-sm border-0 border-l-4 border-l-red-400">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                            <span className="text-xl font-bold text-red-500">!</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{reportData.weakestSection.sectionName}</h3>
                            <p className="text-sm text-gray-500">정답률 {reportData.weakestSection.accuracy}% · 오답 {reportData.weakestSection.wrongCount}개</p>
                          </div>
                        </div>
                        <Badge className="text-lg px-4 py-2 bg-red-100 text-red-700">
                          집중 필요
                        </Badge>
                      </div>

                      {reportData.weakestSectionDetails && (
                        <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                          <h4 className="font-bold text-sm mb-2 text-pink-600">💡 핵심 학습 내용</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {reportData.weakestSectionDetails.coreContent}
                          </p>
                        </div>
                      )}

                      {reportData.weakestSection.tasks.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="font-bold text-sm text-gray-700">📚 추가 학습 과제</h4>
                          {reportData.weakestSection.tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                              data-testid={`weak-section-task-${idx}`}
                            >
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{task}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Print Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => window.print()}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3"
                >
                  📄 리포트 인쇄하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

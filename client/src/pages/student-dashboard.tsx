import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Student, TestResult } from "@/lib/types";
import { format } from "date-fns";

interface StudentDashboardProps {
  student: Student;
  onStartTest: () => void;
}

export default function StudentDashboard({ student, onStartTest }: StudentDashboardProps) {
  const [, setLocation] = useLocation();

  // Fetch student's test results
  const { data: testResults, isLoading } = useQuery<TestResult[]>({
    queryKey: ['/api/test-results', 'student', student.id],
    queryFn: async () => {
      const response = await fetch(`/api/test-results/student/${student.id}`);
      if (!response.ok) throw new Error('Failed to fetch results');
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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">{student.name}</h1>
                <p className="text-xs text-muted-foreground">{student.grade}</p>
              </div>
            </div>
            <Button
              onClick={onStartTest}
              className="bg-primary text-primary-foreground"
              data-testid="start-new-test"
            >
              새 테스트
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
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, User, Award, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import type { Student, TestResult, Test } from "@shared/schema";
import logoImg from "@assets/403e7f94-9ba8-4bcc-b0ee-9d85daaea925_1760051026579.jpg";

export default function Analytics() {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  const { data: allResults } = useQuery<(TestResult & { student: Student, test: Test })[]>({
    queryKey: ['/api/test-results/all'],
  });

  const filteredResults = allResults?.filter(result => {
    if (selectedStudent && selectedStudent !== 'all' && result.studentId !== selectedStudent) return false;
    if (selectedGrade && selectedGrade !== 'all' && result.student.grade !== selectedGrade) return false;
    return true;
  }) || [];

  const scoreHistory = filteredResults
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .map(result => ({
      date: new Date(result.completedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      score: result.score,
      testName: result.test.name,
    }));

  const sectionPerformance = filteredResults.reduce((acc, result) => {
    result.sectionScores.forEach(section => {
      const existing = acc.find(s => s.sectionNumber === section.sectionNumber);
      if (existing) {
        existing.totalCorrect += section.correct;
        existing.totalQuestions += section.total;
        existing.count += 1;
      } else {
        acc.push({
          sectionNumber: section.sectionNumber,
          totalCorrect: section.correct,
          totalQuestions: section.total,
          count: 1,
        });
      }
    });
    return acc;
  }, [] as { sectionNumber: number; totalCorrect: number; totalQuestions: number; count: number }[])
    .map(s => ({
      section: `섹션 ${s.sectionNumber}`,
      accuracy: Math.round((s.totalCorrect / s.totalQuestions) * 100),
    }));

  const taskDistribution = filteredResults.reduce((acc, result) => {
    result.assignedTasks.forEach(task => {
      acc[task.taskType] = (acc[task.taskType] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const taskData = [
    { name: '기본 과제', value: taskDistribution.light || 0, color: '#10b981' },
    { name: '중급 과제', value: taskDistribution.medium || 0, color: '#f59e0b' },
    { name: '심화 과제', value: taskDistribution.heavy || 0, color: '#ef4444' },
  ];

  const averageScore = filteredResults.length > 0
    ? Math.round(filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length)
    : 0;

  const latestScore = filteredResults.length > 0
    ? filteredResults[filteredResults.length - 1].score
    : 0;

  const previousScore = filteredResults.length > 1
    ? filteredResults[filteredResults.length - 2].score
    : latestScore;

  const scoreTrend = latestScore - previousScore;

  const gradeDistribution = students?.reduce((acc, student) => {
    acc[student.grade] = (acc[student.grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={logoImg} 
              alt="목동에이원과학학원" 
              className="h-12 w-auto"
              data-testid="logo-analytics"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">성적 분석</h1>
              <p className="text-gray-600 mt-1">학생 성과 및 트렌드 분석</p>
            </div>
          </div>
          <Link href="/admin" data-testid="back-to-admin">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              관리자로 돌아가기
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger data-testid="select-student-filter">
              <SelectValue placeholder="모든 학생" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 학생</SelectItem>
              {students?.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name} ({student.studentId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger data-testid="select-grade-filter">
              <SelectValue placeholder="모든 학년" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 학년</SelectItem>
              <SelectItem value="중등1학년">중등1학년</SelectItem>
              <SelectItem value="중등2학년">중등2학년</SelectItem>
              <SelectItem value="중등3학년">중등3학년</SelectItem>
              <SelectItem value="고등1학년">고등1학년</SelectItem>
              <SelectItem value="고등2학년">고등2학년</SelectItem>
              <SelectItem value="고등3학년">고등3학년</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-600" />
                평균 점수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="average-score">{averageScore}점</div>
              <p className="text-sm text-gray-600 mt-1">
                총 {filteredResults.length}개 시험
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-green-600" />
                최근 점수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="latest-score">{latestScore}점</div>
              <div className="flex items-center gap-1 mt-1">
                {scoreTrend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm ${scoreTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {scoreTrend > 0 ? '+' : ''}{scoreTrend}점
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                총 학생 수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="total-students">{students?.length || 0}명</div>
              <p className="text-sm text-gray-600 mt-1">
                {Object.keys(gradeDistribution).length}개 학년
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>점수 추이</CardTitle>
              <CardDescription>시간에 따른 점수 변화</CardDescription>
            </CardHeader>
            <CardContent>
              {scoreHistory.length > 0 ? (
                <ChartContainer
                  config={{
                    score: {
                      label: "점수",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <LineChart data={scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>섹션별 정확도</CardTitle>
              <CardDescription>각 섹션의 평균 정답률</CardDescription>
            </CardHeader>
            <CardContent>
              {sectionPerformance.length > 0 ? (
                <ChartContainer
                  config={{
                    accuracy: {
                      label: "정확도 (%)",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={sectionPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="section" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="accuracy" fill="hsl(var(--primary))" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>과제 분포</CardTitle>
            <CardDescription>할당된 과제 유형별 분포</CardDescription>
          </CardHeader>
          <CardContent>
            {taskData.some(d => d.value > 0) ? (
              <div className="flex items-center justify-center">
                <ChartContainer
                  config={{
                    light: { label: "기본 과제", color: "#10b981" },
                    medium: { label: "중급 과제", color: "#f59e0b" },
                    heavy: { label: "심화 과제", color: "#ef4444" },
                  }}
                  className="h-[300px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={taskData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {taskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

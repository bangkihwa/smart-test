import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import type { Student, Test, TestResult } from "@shared/schema";
import logoImg from "@assets/403e7f94-9ba8-4bcc-b0ee-9d85daaea925_1760051026579.jpg";

// 색상 팔레트
const COLORS = {
  primary: '#ec4899',
  secondary: '#8b5cf6',
  accent: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
  warning: '#f97316',
  danger: '#ef4444',
};

const PIE_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#06b6d4'];
const DIFFICULTY_COLORS = {
  easy: '#22c55e',
  medium: '#3b82f6',
  hard: '#f59e0b',
  veryHard: '#ef4444',
};

// 난이도 레이블
const DIFFICULTY_LABELS = {
  light: { label: '하 (쉬움)', color: DIFFICULTY_COLORS.easy },
  medium: { label: '중 (보통)', color: DIFFICULTY_COLORS.medium },
  heavy: { label: '상 (어려움)', color: DIFFICULTY_COLORS.hard },
};

export default function AnalysisReport() {
  const [selectedTest, setSelectedTest] = useState<string>("all");

  const { data: tests } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
  });

  const { data: allResults } = useQuery<(TestResult & { student: Student, test: Test })[]>({
    queryKey: ['/api/test-results/all'],
  });

  // 필터링된 결과
  const filteredResults = allResults?.filter(result => {
    if (!result.student || !result.test) return false;
    if (selectedTest && selectedTest !== 'all' && result.testId !== selectedTest) return false;
    return true;
  }) || [];

  // 선택된 테스트 정보
  const selectedTestData = selectedTest !== 'all'
    ? tests?.find(t => t.id === selectedTest)
    : null;

  // 기본 통계 계산
  const totalQuestions = selectedTestData
    ? selectedTestData.sections.reduce((sum, s) => sum + s.answers.length, 0)
    : 30;

  const totalSections = selectedTestData?.sections.length || 3;
  const averageScore = filteredResults.length > 0
    ? Math.round(filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length)
    : 0;

  // 난이도 계산 (평균 점수 기반)
  const getDifficultyLevel = (score: number) => {
    if (score >= 80) return { level: '하', label: 'Low Difficulty', color: DIFFICULTY_COLORS.easy };
    if (score >= 60) return { level: '중', label: 'Medium Difficulty', color: DIFFICULTY_COLORS.medium };
    if (score >= 40) return { level: '상', label: 'High Difficulty', color: DIFFICULTY_COLORS.hard };
    return { level: '최상', label: 'Very High Difficulty', color: DIFFICULTY_COLORS.veryHard };
  };

  const difficulty = getDifficultyLevel(averageScore);

  // 단원별 분석 데이터
  const sectionAnalysis = () => {
    if (!filteredResults.length) return [];

    const sectionData: Record<number, { correct: number; total: number; wrongQuestions: number[] }> = {};

    filteredResults.forEach(result => {
      result.sectionScores.forEach(score => {
        if (!sectionData[score.sectionNumber]) {
          sectionData[score.sectionNumber] = { correct: 0, total: 0, wrongQuestions: [] };
        }
        sectionData[score.sectionNumber].correct += score.correct;
        sectionData[score.sectionNumber].total += score.total;
        sectionData[score.sectionNumber].wrongQuestions.push(...score.wrongAnswers);
      });
    });

    return Object.entries(sectionData).map(([num, data]) => {
      const section = selectedTestData?.sections.find(s => s.sectionNumber === parseInt(num));
      return {
        name: section?.name || `섹션 ${num}`,
        sectionNumber: parseInt(num),
        correctRate: Math.round((data.correct / data.total) * 100),
        totalAttempts: data.total,
        wrongCount: data.wrongQuestions.length,
      };
    });
  };

  // 난이도 분포 (과제 타입 기반)
  const difficultyDistribution = () => {
    if (!filteredResults.length) return [];

    const distribution = { light: 0, medium: 0, heavy: 0 };

    filteredResults.forEach(result => {
      result.assignedTasks.forEach(task => {
        distribution[task.taskType as keyof typeof distribution]++;
      });
    });

    const total = distribution.light + distribution.medium + distribution.heavy;

    return [
      { name: '하 (쉬움)', value: distribution.light, percentage: Math.round((distribution.light / total) * 100), color: DIFFICULTY_COLORS.easy },
      { name: '중 (보통)', value: distribution.medium, percentage: Math.round((distribution.medium / total) * 100), color: DIFFICULTY_COLORS.medium },
      { name: '상 (어려움)', value: distribution.heavy, percentage: Math.round((distribution.heavy / total) * 100), color: DIFFICULTY_COLORS.hard },
    ];
  };

  // 단원별 난이도 분포 (Stacked Bar)
  const sectionDifficultyData = () => {
    if (!filteredResults.length) return [];

    const data: Record<string, { name: string; light: number; medium: number; heavy: number }> = {};

    filteredResults.forEach(result => {
      result.assignedTasks.forEach(task => {
        const section = selectedTestData?.sections.find(s => s.sectionNumber === task.sectionNumber);
        const sectionName = section?.name || `섹션 ${task.sectionNumber}`;

        if (!data[sectionName]) {
          data[sectionName] = { name: sectionName, light: 0, medium: 0, heavy: 0 };
        }
        data[sectionName][task.taskType as 'light' | 'medium' | 'heavy']++;
      });
    });

    return Object.values(data);
  };

  // 점수 분포 데이터
  const scoreDistribution = () => {
    if (!filteredResults.length) return [];

    const ranges = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];

    filteredResults.forEach(result => {
      const range = ranges.find(r => result.score >= r.min && result.score <= r.max);
      if (range) range.count++;
    });

    return ranges.map((r, i) => ({
      name: r.range,
      학생수: r.count,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  };

  // 오답 패턴 분석
  const wrongAnswerPattern = () => {
    if (!filteredResults.length) return [];

    const wrongCounts: Record<number, number> = {};

    filteredResults.forEach(result => {
      result.sectionScores.forEach(score => {
        score.wrongAnswers.forEach(q => {
          wrongCounts[q] = (wrongCounts[q] || 0) + 1;
        });
      });
    });

    return Object.entries(wrongCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count], index) => ({
        question: `${question}번`,
        오답횟수: count,
        fill: PIE_COLORS[index % PIE_COLORS.length],
      }));
  };

  // 레이더 차트 데이터 (단원별 정답률)
  const radarData = sectionAnalysis().map(s => ({
    subject: s.name,
    정답률: s.correctRate,
    fullMark: 100,
  }));

  const sections = sectionAnalysis();
  const diffDist = difficultyDistribution();
  const sectionDiff = sectionDifficultyData();
  const scoreDist = scoreDistribution();
  const wrongPattern = wrongAnswerPattern();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #faf5ff 50%, #f0f9ff 100%)' }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoImg} alt="로고" className="h-10 w-auto" />
              <div>
                <p className="text-xs text-gray-500">인쇄하기</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="테스트 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 테스트</SelectItem>
                  {tests?.map((test) => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link href="/admin">
                <Button variant="outline">관리자로 돌아가기</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gray-800">{selectedTestData?.subject || '통합과학'}</span>
            {' '}
            <span style={{ color: COLORS.primary }}>기출분석</span>
          </h1>
          <p className="text-gray-500">
            {selectedTestData?.name || '전체 테스트'} 완벽 분석 리포트
          </p>

          {/* Difficulty Badge */}
          <div className="absolute top-24 right-8 text-center">
            <div className="text-6xl font-bold" style={{ color: difficulty.color }}>
              {difficulty.level}
            </div>
            <p className="text-sm text-gray-500">{difficulty.label}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Badge className="px-4 py-2 text-sm bg-pink-100 text-pink-700 hover:bg-pink-100">
            📊 총 {totalQuestions}문항
          </Badge>
          <Badge className="px-4 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-100">
            ✓ 응시 {filteredResults.length}회
          </Badge>
          <Badge className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            📝 평균 {averageScore}점
          </Badge>
          <Badge className="px-4 py-2 text-sm bg-purple-100 text-purple-700 hover:bg-purple-100">
            📚 출제 단원 {totalSections}개
          </Badge>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-pink-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold text-pink-500">{totalQuestions}</div>
              <p className="text-sm text-gray-500">총 문항 수</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <div className="text-3xl font-bold text-blue-500">{totalSections}</div>
              <p className="text-sm text-gray-500">출제 단원</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="text-3xl font-bold text-orange-500">{averageScore}</div>
              <p className="text-sm text-gray-500">평균 점수</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div className="text-3xl font-bold text-green-500">{filteredResults.length}</div>
              <p className="text-sm text-gray-500">응시 횟수</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <div className="text-3xl font-bold text-purple-500">
                {filteredResults.length > 0 ? Math.max(...filteredResults.map(r => r.score)) : 0}
              </div>
              <p className="text-sm text-gray-500">최고 점수</p>
            </CardContent>
          </Card>
        </div>

        {/* Section Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">📊</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">단원별 출제 분석</h2>
        </div>

        {/* Charts Row 1 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 단원별 문항 분포 (Pie) */}
          <Card className="bg-white shadow-sm border-0 border-t-4 border-t-pink-400">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-2">단원별 문항 분포</h3>
              <p className="text-sm text-gray-500 mb-4">각 단원에서 출제된 문항 비율</p>

              <div className="flex items-center justify-center">
                <div className="w-64 h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={sections.map(s => ({ name: s.name, value: s.totalAttempts }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {sections.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ml-4 space-y-2">
                  {sections.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 단원별 정답률 (Radar) */}
          <Card className="bg-white shadow-sm border-0 border-t-4 border-t-purple-400">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-2">단원별 정답률</h3>
              <p className="text-sm text-gray-500 mb-4">각 단원의 평균 정답률</p>

              <div className="h-64">
                <ResponsiveContainer>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="정답률"
                      dataKey="정답률"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {sections.map((section, index) => (
            <Card key={section.name} className="bg-white shadow-sm border-0 overflow-hidden">
              <div className="h-1" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  >
                    {section.sectionNumber}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">{section.name}</h4>
                    <p className="text-sm text-gray-500">{section.totalAttempts}문항 응시</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>정답률</span>
                    <span className="font-bold">{section.correctRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${section.correctRate}%`,
                        backgroundColor: PIE_COLORS[index % PIE_COLORS.length]
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Difficulty Section */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">🔥</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">난이도 분포</h2>
        </div>

        {/* Charts Row 2 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 난이도 분포 (Donut) */}
          <Card className="bg-white shadow-sm border-0 border-t-4 border-t-yellow-400">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-2">난이도 분포</h3>
              <p className="text-sm text-gray-500 mb-4">하 · 중 · 상</p>

              <div className="flex items-center justify-center">
                <div className="w-64 h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={diffDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {diffDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ml-4 space-y-3">
                  {diffDist.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-sm">{d.name}</span>
                      <span className="text-sm font-bold">({d.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 단원별 난이도 분포 (Stacked Bar) */}
          <Card className="bg-white shadow-sm border-0 border-t-4 border-t-orange-400">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-2">단원별 난이도 분포</h3>
              <p className="text-sm text-gray-500 mb-4">각 단원의 난이도 구성</p>

              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={sectionDiff} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="light" name="하" stackId="a" fill={DIFFICULTY_COLORS.easy} />
                    <Bar dataKey="medium" name="중" stackId="a" fill={DIFFICULTY_COLORS.medium} />
                    <Bar dataKey="heavy" name="상" stackId="a" fill={DIFFICULTY_COLORS.hard} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Distribution Section */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">📈</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">점수 분포</h2>
        </div>

        {/* Charts Row 3 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 점수 분포 */}
          <Card className="bg-white shadow-sm border-0 border-t-4 border-t-blue-400">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-2">점수대별 분포</h3>
              <p className="text-sm text-gray-500 mb-4">학생들의 점수 분포</p>

              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={scoreDist}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="학생수" radius={[8, 8, 0, 0]}>
                      {scoreDist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 오답 패턴 */}
          <Card className="bg-white shadow-sm border-0 border-t-4 border-t-red-400">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-2">오답 패턴 분석</h3>
              <p className="text-sm text-gray-500 mb-4">학생들이 자주 틀리는 문항</p>

              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={wrongPattern}>
                    <XAxis dataKey="question" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="오답횟수" radius={[8, 8, 0, 0]}>
                      {wrongPattern.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* High Difficulty Section */}
        {wrongPattern.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">🔥</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">고난도 문항 - 특별 주의 필요</h2>
            </div>

            <Card className="bg-white shadow-sm border-0 mb-8">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">문항</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">단원</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">오답 횟수</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">난이도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {wrongPattern.slice(0, 5).map((item, index) => {
                      const questionNum = parseInt(item.question);
                      const sectionNum = Math.ceil(questionNum / 10);
                      const section = selectedTestData?.sections.find(s => s.sectionNumber === sectionNum);

                      return (
                        <tr key={item.question} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-medium">{item.question}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className="text-white"
                              style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                            >
                              {section?.name || `섹션 ${sectionNum}`}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-red-500">{item.오답횟수}회</span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className="bg-red-100 text-red-700">상</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Print Button */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3"
          >
            📄 리포트 인쇄하기
          </Button>
          <Link href="/reports">
            <Button variant="outline" className="px-8 py-3">
              📊 상세 성적표 보기
            </Button>
          </Link>
        </div>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header { display: none; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}

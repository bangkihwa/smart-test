import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TestResult, Test } from "@/lib/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface TestResultWithTest extends TestResult {
  test?: Test;
}

interface TestStatistics {
  totalStudents: number;
  averageScore: number;
  topRankers: Array<{
    rank: number;
    maskedName: string;
    score: number;
  }>;
}

// Circular Progress Component
function CircularProgress({ value, size = 120, strokeWidth = 10, color = "#3b82f6" }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold">{value}</span>
      </div>
    </div>
  );
}

// Donut Chart Component for Section Scores
function DonutChart({ correct, total, size = 80 }: { correct: number; total: number; size?: number }) {
  const percentage = (correct / total) * 100;
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 80) return "#22c55e";
    if (percentage >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          className="text-gray-100 dark:text-gray-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold">{correct}</span>
        <span className="text-[10px] text-muted-foreground">/{total}</span>
      </div>
    </div>
  );
}

export default function TestResults() {
  const [match, params] = useRoute("/results/:resultId");
  const resultId = params?.resultId;

  const { data: resultData, isLoading } = useQuery<TestResultWithTest>({
    queryKey: ['/api/test-results', resultId],
    queryFn: async () => {
      const response = await fetch(`/api/test-results/${resultId}`);
      if (!response.ok) throw new Error('Failed to fetch result');
      return response.json();
    },
    enabled: !!resultId,
  });

  const result = resultData;
  const test = resultData?.test;

  // 테스트 통계 조회
  const { data: statistics } = useQuery<TestStatistics>({
    queryKey: ['/api/test-results/statistics', test?.id],
    queryFn: async () => {
      const response = await fetch(`/api/test-results/statistics/${test?.id}`);
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    },
    enabled: !!test?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground animate-pulse">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!result || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">결과를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-6">잘못된 링크이거나 결과가 삭제되었을 수 있습니다.</p>
          <Button onClick={() => window.location.href = '/'}>
            메인으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const totalCorrect = result.sectionScores.reduce((sum, s) => sum + s.correct, 0);
  const totalQuestions = result.sectionScores.reduce((sum, s) => sum + s.total, 0);
  const totalWrong = totalQuestions - totalCorrect;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#22c55e";
    if (score >= 70) return "#3b82f6";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return { emoji: "🎉", message: "훌륭해요!", sub: "완벽에 가까운 성적입니다!" };
    if (score >= 70) return { emoji: "👍", message: "잘했어요!", sub: "조금만 더 노력하면 완벽해요!" };
    if (score >= 50) return { emoji: "💪", message: "힘내세요!", sub: "복습하면 더 좋아질 거예요!" };
    return { emoji: "📚", message: "열심히 해봐요!", sub: "기초부터 차근차근 복습해요!" };
  };

  const scoreInfo = getScoreMessage(result.score);

  const getTaskBadgeColor = (taskType: string) => {
    switch (taskType) {
      case 'light': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'heavy': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTaskLabel = (taskType: string) => {
    switch (taskType) {
      case 'light': return '기본 과제';
      case 'medium': return '보충 과제';
      case 'heavy': return '심화 과제';
      default: return '과제';
    }
  };

  const sectionColors = ['#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      {/* Animated Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="relative px-6 py-8 text-white">
          {/* Test Info */}
          <div className="text-center mb-6">
            <Badge className="bg-white/20 text-white border-white/30 mb-3">
              {test.subject} · {test.grade}
            </Badge>
            <h1 className="text-2xl font-bold mb-1">{test.name}</h1>
            <p className="text-white/70 text-sm">
              {format(new Date(result.completedAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
            </p>
          </div>

          {/* Main Score Circle */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <CircularProgress
                value={result.score}
                size={160}
                strokeWidth={12}
                color={getScoreColor(result.score)}
              />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <span className="text-lg font-medium text-white/90">점</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <p className="text-4xl mb-1">{scoreInfo.emoji}</p>
              <p className="text-xl font-bold">{scoreInfo.message}</p>
              <p className="text-white/70 text-sm">{scoreInfo.sub}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-300">{totalCorrect}</div>
              <div className="text-xs text-white/70">정답</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-300">{totalWrong}</div>
              <div className="text-xs text-white/70">오답</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-300">{totalQuestions}</div>
              <div className="text-xs text-white/70">총 문항</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Section Overview Chart */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                📊
              </span>
              파트별 성적 분석
            </h3>

            <div className="flex justify-around items-end mb-6">
              {result.sectionScores.map((sectionScore, index) => {
                const section = test.sections.find(s => s.sectionNumber === sectionScore.sectionNumber);
                const percentage = Math.round((sectionScore.correct / sectionScore.total) * 100);

                return (
                  <div key={sectionScore.sectionNumber} className="text-center">
                    <DonutChart correct={sectionScore.correct} total={sectionScore.total} />
                    <p className="text-sm font-medium mt-2" style={{ color: sectionColors[index] }}>
                      {section?.name || `파트 ${sectionScore.sectionNumber}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                );
              })}
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              {result.sectionScores.map((sectionScore, index) => {
                const section = test.sections.find(s => s.sectionNumber === sectionScore.sectionNumber);
                const percentage = Math.round((sectionScore.correct / sectionScore.total) * 100);

                return (
                  <div key={sectionScore.sectionNumber}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{section?.name || `파트 ${sectionScore.sectionNumber}`}</span>
                      <span className="text-sm text-muted-foreground">{sectionScore.correct}/{sectionScore.total}</span>
                    </div>
                    <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: sectionColors[index],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Test Statistics - 응시 현황 및 랭킹 */}
        {statistics && statistics.totalStudents > 0 && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mr-3">
                  🏆
                </span>
                응시 현황 및 랭킹
              </h3>

              {/* 통계 요약 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{statistics.totalStudents}</div>
                  <div className="text-sm text-blue-600/70 dark:text-blue-400/70">응시 학생수</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{statistics.averageScore}점</div>
                  <div className="text-sm text-green-600/70 dark:text-green-400/70">평균 점수</div>
                </div>
              </div>

              {/* 상위 5명 랭킹 */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center">
                  <span className="mr-2">👑</span> TOP 5 랭킹
                </h4>
                <div className="space-y-2">
                  {statistics.topRankers.map((ranker) => (
                    <div
                      key={ranker.rank}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        ranker.rank === 1
                          ? 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40'
                          : ranker.rank === 2
                          ? 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/40 dark:to-slate-800/40'
                          : ranker.rank === 3
                          ? 'bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40'
                          : 'bg-white/50 dark:bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          ranker.rank === 1
                            ? 'bg-yellow-400 text-yellow-900'
                            : ranker.rank === 2
                            ? 'bg-gray-300 text-gray-700'
                            : ranker.rank === 3
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {ranker.rank}
                        </div>
                        <span className="font-medium">{ranker.maskedName}</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`font-bold text-lg ${
                          ranker.rank === 1
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : ranker.rank === 2
                            ? 'text-gray-600 dark:text-gray-400'
                            : ranker.rank === 3
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {ranker.score}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">점</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Section Results */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center px-2">
            <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
              📝
            </span>
            상세 결과 및 과제
          </h3>

          {result.sectionScores.map((sectionScore, index) => {
            const section = test.sections.find(s => s.sectionNumber === sectionScore.sectionNumber);
            const task = result.assignedTasks.find(t => t.sectionNumber === sectionScore.sectionNumber);

            if (!section || !task) return null;

            return (
              <Card key={sectionScore.sectionNumber} className="border-0 shadow-lg overflow-hidden">
                <div
                  className="h-1.5"
                  style={{ backgroundColor: sectionColors[index] }}
                />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: sectionColors[index] }}
                      >
                        {sectionScore.sectionNumber}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{section.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {(sectionScore.sectionNumber - 1) * 10 + 1}번 ~ {sectionScore.sectionNumber * 10}번
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: sectionColors[index] }}>
                        {sectionScore.correct}/{sectionScore.total}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round((sectionScore.correct / sectionScore.total) * 100)}점
                      </div>
                    </div>
                  </div>

                  {/* Wrong Answers */}
                  {sectionScore.wrongAnswers.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium text-red-500">❌ 틀린 문제</span>
                        <Badge variant="destructive" className="text-xs">
                          {sectionScore.wrongAnswers.length}개
                        </Badge>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 space-y-2">
                        {sectionScore.wrongAnswers.map(questionNum => {
                          const studentAnswer = result.answers[questionNum - 1];
                          const correctAnswer = section.answers[(questionNum - 1) % 10];
                          return (
                            <div
                              key={questionNum}
                              className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-sm font-bold text-red-600">
                                  {questionNum}
                                </span>
                                <span className="text-sm text-muted-foreground">번 문제</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                                  <span className="text-xs text-red-600 dark:text-red-400">내 답</span>
                                  <span className="font-bold text-red-600 dark:text-red-400">{studentAnswer}</span>
                                </div>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                                <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                  <span className="text-xs text-green-600 dark:text-green-400">정답</span>
                                  <span className="font-bold text-green-600 dark:text-green-400">{correctAnswer}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex items-center justify-center space-x-2">
                      <span className="text-2xl">🎯</span>
                      <span className="font-medium text-green-600 dark:text-green-400">모두 정답! 완벽해요!</span>
                    </div>
                  )}

                  {/* Assigned Task */}
                  <div className={`rounded-xl p-4 ${getTaskBadgeColor(task.taskType).replace('text-', 'bg-').split(' ')[0]}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {task.taskType === 'light' ? '📗' : task.taskType === 'medium' ? '📙' : '📕'}
                        </span>
                        <span className={`font-bold ${getTaskBadgeColor(task.taskType).split(' ')[1]}`}>
                          {getTaskLabel(task.taskType)}
                        </span>
                      </div>
                      <Badge className={getTaskBadgeColor(task.taskType)}>
                        {task.taskType === 'light' ? '0-2개 오답' : task.taskType === 'medium' ? '3-4개 오답' : '5개+ 오답'}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{task.task}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => window.print()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            결과 출력하기
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="w-full font-semibold py-6 rounded-xl border-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            메인으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}

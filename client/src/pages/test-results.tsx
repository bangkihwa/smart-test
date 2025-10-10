import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TestResult, Student, Test } from "@/lib/types";

export default function TestResults() {
  const [match, params] = useRoute("/results/:resultId");
  const resultId = params?.resultId;

  const { data: result, isLoading } = useQuery({
    queryKey: ['/api/test-results', resultId],
    enabled: !!resultId,
  });

  const { data: student } = useQuery({
    queryKey: ['/api/students', result?.studentId],
    enabled: !!result?.studentId,
  });

  const { data: test } = useQuery({
    queryKey: ['/api/tests', result?.testId],
    enabled: !!result?.testId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!result || !student || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">결과를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground">잘못된 링크이거나 결과가 삭제되었을 수 있습니다.</p>
        </div>
      </div>
    );
  }

  const getTaskBadgeVariant = (taskType: string) => {
    switch (taskType) {
      case 'light': return 'default';
      case 'medium': return 'secondary';
      case 'heavy': return 'destructive';
      default: return 'default';
    }
  };

  const getTaskLabel = (taskType: string) => {
    switch (taskType) {
      case 'light': return '기본 과제';
      case 'medium': return '중급 과제';
      case 'heavy': return '심화 과제';
      default: return '과제';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">채점 완료!</h2>
          <p className="text-primary-foreground/80">{test.name}</p>
        </div>

        <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
          <div className="text-center mb-4">
            <div className="text-5xl font-bold mb-2" data-testid="total-score">{result.score}</div>
            <div className="text-sm opacity-90">점</div>
          </div>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">{result.sectionScores.reduce((sum, section) => sum + section.correct, 0)}/30</div>
              <div className="opacity-80">정답</div>
            </div>
            <div className="w-px h-8 bg-white/30"></div>
            <div className="text-center">
              <div className="font-semibold">{result.sectionScores.reduce((sum, section) => sum + section.wrongAnswers.length, 0)}</div>
              <div className="opacity-80">오답</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Section Results */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">파트별 결과</h3>
          
          <div className="space-y-3">
            {result.sectionScores.map((sectionScore, index) => {
              const section = test.sections.find(s => s.sectionNumber === sectionScore.sectionNumber);
              const task = result.assignedTasks.find(t => t.sectionNumber === sectionScore.sectionNumber);
              
              if (!section || !task) return null;

              return (
                <Card key={sectionScore.sectionNumber}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-${index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent'}/10 rounded-lg flex items-center justify-center`}>
                          <svg className={`w-5 h-5 text-${index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{section.name}</h4>
                          <p className="text-xs text-muted-foreground">{(sectionScore.sectionNumber - 1) * 10 + 1}-{sectionScore.sectionNumber * 10}번</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">{sectionScore.correct}/{sectionScore.total}</div>
                        <div className="text-xs text-muted-foreground">{sectionScore.wrongAnswers.length}개 오답</div>
                      </div>
                    </div>
                    
                    {sectionScore.wrongAnswers.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center space-x-1 text-xs mb-2">
                          <span className="text-muted-foreground">오답:</span>
                          {sectionScore.wrongAnswers.map(questionNum => (
                            <Badge key={questionNum} variant="destructive" className="text-xs">
                              {questionNum}번
                            </Badge>
                          ))}
                        </div>
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2">
                          <p className="text-sm font-semibold text-destructive mb-2">틀린 문제 상세</p>
                          {sectionScore.wrongAnswers.map(questionNum => {
                            const studentAnswer = result.answers[questionNum - 1];
                            const correctAnswer = test.sections
                              .find(s => s.sectionNumber === sectionScore.sectionNumber)
                              ?.answers[(questionNum - 1) % 10];
                            return (
                              <div key={questionNum} className="flex items-center justify-between text-sm bg-background/50 rounded p-2">
                                <span className="font-medium">{questionNum}번</span>
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-muted-foreground text-xs">내 답:</span>
                                    <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
                                      {studentAnswer}
                                    </Badge>
                                  </div>
                                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                  </svg>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-muted-foreground text-xs">정답:</span>
                                    <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                                      {correctAnswer}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-accent/10 border border-accent/20 rounded-md p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-accent">📚 {getTaskLabel(task.taskType)}</p>
                        <Badge variant={getTaskBadgeVariant(task.taskType)} className="text-xs">
                          {task.taskType === 'light' ? '0-2개 오답' : task.taskType === 'medium' ? '3-4개 오답' : '5개 이상 오답'}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">{task.task}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Core Content Feedback */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">핵심 내용 피드백</h3>
          
          <div className="space-y-3">
            {test.sections.map((section, index) => (
              <Card key={section.sectionNumber}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <svg className={`w-5 h-5 text-${index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent'} mt-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-2">{section.name}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {section.coreContent}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => window.print()} 
            className="w-full bg-primary text-primary-foreground font-semibold py-3"
            data-testid="print-results-button"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            결과 출력하기
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="w-full font-semibold py-3"
            data-testid="back-to-home-button"
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OMRPreviewProps {
  answers: number[];
  onAnswersChange: (answers: number[]) => void;
  confidences?: number[];
}

export default function OMRPreview({ answers, onAnswersChange, confidences }: OMRPreviewProps) {
  const handleAnswerChange = (index: number, value: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = newAnswers[index] === value ? 0 : value;
    onAnswersChange(newAnswers);
  };

  const sections = [
    { number: 1, name: "1부", start: 0 },
    { number: 2, name: "2부", start: 10 },
    { number: 3, name: "3부", start: 20 },
  ];

  const getConfidenceColor = (confidence: number | undefined) => {
    if (confidence === undefined) return '';
    if (confidence >= 0.8) return 'bg-green-50';
    if (confidence >= 0.5) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>답안 확인 및 수정</span>
          <Badge variant="outline">
            응답: {answers.filter(a => a > 0).length}/30
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.number} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge>{section.name}</Badge>
                <span className="text-sm text-muted-foreground">
                  (문항 {section.start + 1} ~ {section.start + 10})
                </span>
              </div>

              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {Array.from({ length: 10 }, (_, i) => {
                  const questionIndex = section.start + i;
                  const questionNumber = questionIndex + 1;
                  const currentAnswer = answers[questionIndex];
                  const confidence = confidences?.[questionIndex];

                  return (
                    <div
                      key={questionIndex}
                      className={`p-2 rounded-lg border ${getConfidenceColor(confidence)}`}
                    >
                      <div className="text-center mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {questionNumber}번
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {[1, 2, 3, 4, 5].map((choice) => (
                          <button
                            key={choice}
                            onClick={() => handleAnswerChange(questionIndex, choice)}
                            className={`w-full h-6 text-xs rounded transition-all ${
                              currentAnswer === choice
                                ? 'bg-primary text-primary-foreground font-bold'
                                : 'bg-muted hover:bg-muted-foreground/20'
                            }`}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                      {currentAnswer === 0 && (
                        <div className="mt-1 text-center">
                          <span className="text-xs text-destructive">미선택</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>도움말:</strong> 버튼을 클릭하여 답안을 수정할 수 있습니다.
            같은 번호를 다시 클릭하면 선택이 취소됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

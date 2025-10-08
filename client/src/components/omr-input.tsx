import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Test } from "@/lib/types";

interface OMRInputProps {
  test: Test;
  onSubmit: (answers: number[]) => void;
  onBack: () => void;
}

export default function OMRInput({ test, onSubmit, onBack }: OMRInputProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(30).fill(null));

  const handleAnswerSelect = (questionIndex: number, answer: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answer;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    // Fill null answers with 0 (no answer)
    const finalAnswers = answers.map(answer => answer || 0);
    onSubmit(finalAnswers);
  };

  const answeredCount = answers.filter(answer => answer !== null).length;
  const progressPercentage = (answeredCount / 30) * 100;

  const getSectionColor = (sectionNumber: number) => {
    switch (sectionNumber) {
      case 1: return 'primary';
      case 2: return 'secondary';  
      case 3: return 'accent';
      default: return 'primary';
    }
  };

  return (
    <div className="pb-24">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-primary-foreground hover:bg-primary-foreground/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{test.name}</h2>
            <p className="text-sm opacity-90">답안을 마킹하세요 (1-30)</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">진행률</span>
              <span className="text-sm font-semibold text-primary">{answeredCount}/30</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* Sections */}
        {test.sections.map((section) => (
          <Card key={section.sectionNumber} className="mb-6">
            <CardHeader>
              <div className={`bg-${getSectionColor(section.sectionNumber)}/5 border-l-4 border-${getSectionColor(section.sectionNumber)} px-4 py-3 rounded-r`}>
                <CardTitle className="text-lg font-semibold">{section.sectionNumber}부. {section.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">핵심: {section.coreContent}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 10 }, (_, i) => {
                const questionIndex = (section.sectionNumber - 1) * 10 + i;
                const questionNumber = questionIndex + 1;
                
                return (
                  <div key={questionIndex} className="bg-card rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-${getSectionColor(section.sectionNumber)} text-${getSectionColor(section.sectionNumber)}-foreground font-semibold text-sm`}>
                        {questionNumber}
                      </span>
                      <div className="flex space-x-2" data-testid={`question-${questionNumber}-answers`}>
                        {[1, 2, 3, 4, 5].map(answer => (
                          <button
                            key={answer}
                            onClick={() => handleAnswerSelect(questionIndex, answer)}
                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring ${
                              answers[questionIndex] === answer
                                ? `bg-${getSectionColor(section.sectionNumber)} text-${getSectionColor(section.sectionNumber)}-foreground border-${getSectionColor(section.sectionNumber)}`
                                : `border-input hover:bg-${getSectionColor(section.sectionNumber)}/10`
                            }`}
                            data-testid={`question-${questionNumber}-answer-${answer}`}
                          >
                            {answer}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Submit Button */}
        <div className="sticky bottom-20 mt-8">
          <Button 
            onClick={handleSubmit} 
            className="w-full bg-primary text-primary-foreground font-semibold py-4 text-lg shadow-lg"
            data-testid="submit-test-button"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            제출하기
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import OMRPreview from "./OMRPreview";

interface ScanResult {
  success: boolean;
  scanResult: {
    testId: string | null;
    studentId: string | null;
    answers: number[];
    confidence: number;
    errors: string[];
  };
  studentInfo: {
    id: string;
    studentId: string;
    name: string;
    grade: string;
  } | null;
  testInfo: {
    id: string;
    testId: string;
    name: string;
    subject: string;
    grade: string;
  } | null;
  needsReview: boolean;
}

interface TestOption {
  id: string;
  testId: string;
  name: string;
  subject: string;
  grade: string;
}

interface StudentOption {
  id: string;
  studentId: string;
  name: string;
  grade: string;
}

type ScanStep = 'upload' | 'processing' | 'preview' | 'success';

export default function OMRScanner() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ScanStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // 수동 선택용 상태
  const [manualTestId, setManualTestId] = useState<string>('');
  const [manualStudentId, setManualStudentId] = useState<string>('');
  const [editedAnswers, setEditedAnswers] = useState<number[]>([]);

  // 테스트 목록 조회
  const { data: tests } = useQuery<TestOption[]>({
    queryKey: ['/api/omr/tests'],
    queryFn: () => apiRequest('/api/omr/tests')
  });

  // 학생 목록 조회
  const { data: students } = useQuery<StudentOption[]>({
    queryKey: ['/api/omr/students'],
    queryFn: () => apiRequest('/api/omr/students')
  });

  // OMR 스캔 mutation
  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/omr/scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('스캔 실패');
      }

      return response.json() as Promise<ScanResult>;
    },
    onSuccess: (data) => {
      setScanResult(data);
      setEditedAnswers([...data.scanResult.answers]);

      // 수동 선택 초기화
      if (data.testInfo) {
        setManualTestId(data.testInfo.testId);
      }
      if (data.studentInfo) {
        setManualStudentId(data.studentInfo.studentId);
      }

      setStep('preview');
    },
    onError: (error) => {
      toast({
        title: "스캔 실패",
        description: error.message,
        variant: "destructive"
      });
      setStep('upload');
    }
  });

  // 제출 mutation
  const submitMutation = useMutation({
    mutationFn: async (data: { studentId: string; testId: string; answers: number[] }) => {
      return apiRequest('/api/omr/submit', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: (result) => {
      toast({
        title: "제출 완료",
        description: `${result.testResult.studentName}님의 결과가 저장되었습니다. 점수: ${result.testResult.score}점`
      });
      setStep('success');
    },
    onError: (error: Error) => {
      toast({
        title: "제출 실패",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleScan = () => {
    if (selectedFile) {
      setStep('processing');
      scanMutation.mutate(selectedFile);
    }
  };

  const handleSubmit = () => {
    const studentId = manualStudentId || scanResult?.studentInfo?.studentId;
    const testId = manualTestId || scanResult?.testInfo?.testId;

    if (!studentId || !testId) {
      toast({
        title: "정보 부족",
        description: "학생과 테스트를 선택해주세요",
        variant: "destructive"
      });
      return;
    }

    submitMutation.mutate({
      studentId,
      testId,
      answers: editedAnswers
    });
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setManualTestId('');
    setManualStudentId('');
    setEditedAnswers([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 업로드 단계
  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            OMR 답안지 스캔
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              id="omr-file-input"
            />

            {previewUrl ? (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="미리보기"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <svg className="w-16 h-16 mx-auto text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-muted-foreground">OMR 답안지 사진을 선택하세요</p>
              </div>
            )}

            <div className="flex justify-center gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                파일 선택
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.capture = 'environment';
                    fileInputRef.current.click();
                  }
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                카메라 촬영
              </Button>
            </div>
          </div>

          {selectedFile && (
            <Button onClick={handleScan} className="w-full" size="lg">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              스캔 시작
            </Button>
          )}

          <Alert>
            <AlertDescription>
              <ul className="text-sm space-y-1">
                <li>- OMR 답안지를 평평한 곳에 놓고 촬영하세요</li>
                <li>- 4개의 모서리 마커가 모두 보이도록 촬영하세요</li>
                <li>- 조명이 고르게 비추도록 하세요</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 처리 중 단계
  if (step === 'processing') {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-6">
          <div className="animate-spin w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full" />
          <div>
            <h3 className="text-lg font-semibold mb-2">OMR 인식 중...</h3>
            <p className="text-muted-foreground">답안지를 분석하고 있습니다</p>
          </div>
          <Progress value={66} className="w-64 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // 미리보기 단계
  if (step === 'preview' && scanResult) {
    return (
      <div className="space-y-6">
        {/* 인식 결과 요약 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>인식 결과</span>
              <Badge variant={scanResult.needsReview ? "destructive" : "default"}>
                신뢰도: {Math.round(scanResult.scanResult.confidence * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scanResult.scanResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="text-sm">
                    {scanResult.scanResult.errors.map((err, i) => (
                      <li key={i}>- {err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 테스트 선택 */}
              <div className="space-y-2">
                <Label>테스트</Label>
                {scanResult.testInfo ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{scanResult.testInfo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {scanResult.testInfo.subject} | {scanResult.testInfo.grade}
                    </p>
                  </div>
                ) : (
                  <Select value={manualTestId} onValueChange={setManualTestId}>
                    <SelectTrigger>
                      <SelectValue placeholder="테스트 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {tests?.map(test => (
                        <SelectItem key={test.id} value={test.testId}>
                          {test.name} ({test.subject})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* 학생 선택 */}
              <div className="space-y-2">
                <Label>학생</Label>
                {scanResult.studentInfo ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{scanResult.studentInfo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {scanResult.studentInfo.studentId} | {scanResult.studentInfo.grade}
                    </p>
                  </div>
                ) : (
                  <Select value={manualStudentId} onValueChange={setManualStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="학생 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.map(student => (
                        <SelectItem key={student.id} value={student.studentId}>
                          {student.name} ({student.studentId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 답안 미리보기/수정 */}
        <OMRPreview
          answers={editedAnswers}
          onAnswersChange={setEditedAnswers}
          confidences={scanResult.scanResult.details?.answerConfidences}
        />

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            다시 촬영
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || (!manualTestId && !scanResult.testInfo) || (!manualStudentId && !scanResult.studentInfo)}
            className="flex-1"
          >
            {submitMutation.isPending ? "제출 중..." : "제출하기"}
          </Button>
        </div>
      </div>
    );
  }

  // 성공 단계
  if (step === 'success') {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">제출 완료!</h3>
            <p className="text-muted-foreground">성적이 성공적으로 저장되었습니다</p>
          </div>
          <Button onClick={handleReset} size="lg">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            다음 답안지 스캔
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

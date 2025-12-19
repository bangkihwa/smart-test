import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Search } from "lucide-react";
import { Link } from "wouter";
import type { Student, Test, TestResult } from "@shared/schema";
import logoImg from "@assets/403e7f94-9ba8-4bcc-b0ee-9d85daaea925_1760051026579.jpg";

// 학년 정규화 함수: 모든 형식을 표준형("고등1학년")으로 변환
function normalizeGrade(grade: string): string {
  if (!grade) return '';

  // 공백 제거
  const normalized = grade.replace(/\s+/g, '');

  // 축약형 -> 전체형 변환
  const gradeMap: Record<string, string> = {
    '중1': '중등1학년',
    '중2': '중등2학년',
    '중3': '중등3학년',
    '고1': '고등1학년',
    '고2': '고등2학년',
    '고3': '고등3학년',
  };

  return gradeMap[normalized] || normalized;
}

// 학년 매칭 함수: "고1" = "고등1학년" = "고등 1학년" 등
function matchGrade(studentGrade: string, filterGrade: string): boolean {
  if (!studentGrade || !filterGrade) return false;

  // 둘 다 정규화하여 비교
  return normalizeGrade(studentGrade) === normalizeGrade(filterGrade);
}

export default function Reports() {
  // 필터 입력값 (사용자가 선택하는 값)
  const [selectedTest, setSelectedTest] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // 실제 적용된 필터값 (검색 버튼 클릭 시 업데이트)
  const [appliedFilters, setAppliedFilters] = useState({
    test: "all",
    grade: "all",
    startDate: "",
    endDate: "",
  });

  const handleSearch = () => {
    setAppliedFilters({
      test: selectedTest,
      grade: selectedGrade,
      startDate: startDate,
      endDate: endDate,
    });
  };

  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  const { data: tests } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
  });

  const { data: allResults } = useQuery<(TestResult & { student: Student, test: Test })[]>({
    queryKey: ['/api/test-results/all'],
  });

  const filteredResults = allResults?.filter(result => {
    if (!result.student || !result.test) return false;
    if (appliedFilters.test && appliedFilters.test !== 'all' && result.testId !== appliedFilters.test) return false;
    if (appliedFilters.grade && appliedFilters.grade !== 'all' && !matchGrade(result.student.grade, appliedFilters.grade)) return false;
    if (appliedFilters.startDate && new Date(result.completedAt) < new Date(appliedFilters.startDate)) return false;
    if (appliedFilters.endDate && new Date(result.completedAt) > new Date(appliedFilters.endDate)) return false;
    return true;
  }) || [];

  const reportData = filteredResults.map(result => {
    const tasksWithNames = result.assignedTasks.map((task: any) => {
      const section = result.test.sections?.find((s: any) => s.sectionNumber === task.sectionNumber);
      return {
        ...task,
        sectionName: section?.name || `섹션 ${task.sectionNumber}`,
      };
    });

    return {
      studentName: result.student.name,
      studentId: result.student.studentId,
      grade: result.student.grade,
      testName: result.test.name,
      subject: result.test.subject,
      score: result.score,
      completedAt: new Date(result.completedAt).toLocaleDateString('ko-KR'),
      sectionScores: result.sectionScores,
      assignedTasks: tasksWithNames,
    };
  });

  const statistics = {
    totalTests: filteredResults.length,
    averageScore: filteredResults.length > 0
      ? Math.round(filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length)
      : 0,
    highestScore: filteredResults.length > 0
      ? Math.max(...filteredResults.map(r => r.score))
      : 0,
    lowestScore: filteredResults.length > 0
      ? Math.min(...filteredResults.map(r => r.score))
      : 0,
    uniqueStudents: new Set(filteredResults.map(r => r.studentId)).size,
  };

  const exportToCSV = () => {
    const headers = ['학생명', '학번', '학년', '시험명', '과목', '점수', '섹션별 점수', '추가과제', '완료일'];
    const rows = reportData.map(row => {
      const sectionScoresText = row.sectionScores
        .map(s => `S${s.sectionNumber}:${s.correct}/${s.total}`)
        .join(' | ');
      
      const tasksText = row.assignedTasks
        .map((t: any) => {
          const level = t.taskType === 'heavy' ? '상' : t.taskType === 'medium' ? '중' : '하';
          return `${t.sectionName}:${level}`;
        })
        .join(' | ');
      
      return [
        row.studentName,
        row.studentId,
        row.grade,
        row.testName,
        row.subject,
        row.score.toString(),
        sectionScoresText,
        tasksText,
        row.completedAt,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `성적_보고서_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={logoImg} 
              alt="목동에이원과학학원" 
              className="h-12 w-auto"
              data-testid="logo-reports"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">통계 보고서</h1>
              <p className="text-gray-600 mt-1">시험 단위, 학생 그룹, 기간별 상세 보고서</p>
            </div>
          </div>
          <Link href="/admin" data-testid="back-to-admin-from-reports">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              관리자로 돌아가기
            </button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              필터 설정
            </CardTitle>
            <CardDescription>보고서 데이터를 필터링하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">시험 선택</label>
                <Select value={selectedTest} onValueChange={setSelectedTest}>
                  <SelectTrigger data-testid="select-test-filter">
                    <SelectValue placeholder="모든 시험" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 시험</SelectItem>
                    {tests?.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">학년 선택</label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger data-testid="select-grade-filter-reports">
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

              <div>
                <label className="text-sm font-medium mb-2 block">시작 날짜</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">종료 날짜</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button onClick={handleSearch} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700" data-testid="search-button">
                <Search className="h-4 w-4" />
                검색하기
              </Button>
              <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2" data-testid="export-csv-button">
                <Download className="h-4 w-4" />
                CSV 다운로드
              </Button>
              <Button onClick={exportToPrint} variant="outline" className="flex items-center gap-2" data-testid="print-report-button">
                <FileText className="h-4 w-4" />
                인쇄하기
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">총 시험 수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-total-tests">{statistics.totalTests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-average-score">{statistics.averageScore}점</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">최고 점수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600" data-testid="stat-highest-score">{statistics.highestScore}점</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">최저 점수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600" data-testid="stat-lowest-score">{statistics.lowestScore}점</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">학생 수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-unique-students">{statistics.uniqueStudents}명</div>
            </CardContent>
          </Card>
        </div>

        <Card className="print-section">
          <CardHeader>
            <CardTitle>상세 성적표</CardTitle>
            <CardDescription>필터링된 시험 결과</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생명</TableHead>
                      <TableHead>학번</TableHead>
                      <TableHead>학년</TableHead>
                      <TableHead>시험명</TableHead>
                      <TableHead>과목</TableHead>
                      <TableHead>점수</TableHead>
                      <TableHead>섹션별 점수</TableHead>
                      <TableHead>추가과제</TableHead>
                      <TableHead>완료일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row, index) => (
                      <tr key={index} data-testid={`report-row-${index}`}>
                        <TableCell className="font-medium">{row.studentName}</TableCell>
                        <TableCell>{row.studentId}</TableCell>
                        <TableCell>{row.grade}</TableCell>
                        <TableCell>{row.testName}</TableCell>
                        <TableCell>{row.subject}</TableCell>
                        <TableCell>
                          <Badge variant={row.score >= 80 ? "default" : row.score >= 60 ? "secondary" : "destructive"}>
                            {row.score}점
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {row.sectionScores.map((section, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                S{section.sectionNumber}: {section.correct}/{section.total}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {row.assignedTasks.map((task: any, idx) => (
                              <Badge 
                                key={idx} 
                                variant={
                                  task.taskType === 'heavy' ? 'destructive' : 
                                  task.taskType === 'medium' ? 'default' : 
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {task.sectionName}: {task.taskType === 'heavy' ? '상' : task.taskType === 'medium' ? '중' : '하'}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{row.completedAt}</TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                선택한 필터에 해당하는 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          table {
            font-size: 10pt;
          }
          th, td {
            padding: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}

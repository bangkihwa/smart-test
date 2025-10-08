import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar } from "lucide-react";
import { Link } from "wouter";
import type { Student, Test, TestResult } from "@shared/schema";

export default function Reports() {
  const [selectedTest, setSelectedTest] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

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
    if (selectedTest && selectedTest !== 'all' && result.testId !== selectedTest) return false;
    if (selectedGrade && selectedGrade !== 'all' && result.student.grade !== selectedGrade) return false;
    if (startDate && new Date(result.completedAt) < new Date(startDate)) return false;
    if (endDate && new Date(result.completedAt) > new Date(endDate)) return false;
    return true;
  }) || [];

  const reportData = filteredResults.map(result => ({
    studentName: result.student.name,
    studentId: result.student.studentId,
    grade: result.student.grade,
    testName: result.test.name,
    subject: result.test.subject,
    score: result.score,
    completedAt: new Date(result.completedAt).toLocaleDateString('ko-KR'),
    sectionScores: result.sectionScores,
    assignedTasks: result.assignedTasks,
  }));

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
    const headers = ['학생명', '학번', '학년', '시험명', '과목', '점수', '완료일'];
    const rows = reportData.map(row => [
      row.studentName,
      row.studentId,
      row.grade,
      row.testName,
      row.subject,
      row.score.toString(),
      row.completedAt,
    ]);

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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">통계 보고서</h1>
            <p className="text-gray-600 mt-1">시험 단위, 학생 그룹, 기간별 상세 보고서</p>
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
              <Button onClick={exportToCSV} className="flex items-center gap-2" data-testid="export-csv-button">
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
                          <div className="flex gap-1">
                            {row.sectionScores.map((section, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                S{section.sectionNumber}: {section.correct}/{section.total}
                              </span>
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
        }
      `}</style>
    </div>
  );
}

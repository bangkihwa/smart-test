import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Database, Upload, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function AirtableSettings() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [baseId, setBaseId] = useState("");
  const [syncResult, setSyncResult] = useState<any>(null);
  const [fetchResult, setFetchResult] = useState<any>(null);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/airtable/sync', {
        apiKey,
        baseId,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setSyncResult(data);
      toast({
        title: "동기화 성공",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "동기화 실패",
        description: error.message || "Airtable 동기화 중 오류가 발생했습니다.",
      });
    },
  });

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/airtable/fetch', {
        apiKey,
        baseId,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setFetchResult(data);
      toast({
        title: "데이터 가져오기 성공",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "가져오기 실패",
        description: error.message || "Airtable에서 데이터를 가져오는 중 오류가 발생했습니다.",
      });
    },
  });

  const handleSync = () => {
    if (!apiKey || !baseId) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "API Key와 Base ID를 모두 입력해주세요.",
      });
      return;
    }
    syncMutation.mutate();
  };

  const handleFetch = () => {
    if (!apiKey || !baseId) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "API Key와 Base ID를 모두 입력해주세요.",
      });
      return;
    }
    fetchMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Airtable 연동</h1>
            <p className="text-gray-600 mt-1">외부 데이터베이스와 동기화</p>
          </div>
          <Link href="/admin" data-testid="back-to-admin-from-airtable">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              관리자로 돌아가기
            </button>
          </Link>
        </div>

        <Alert className="mb-6">
          <Database className="h-4 w-4" />
          <AlertDescription>
            Airtable과 연동하여 학생 데이터, 시험, 성적을 백업하고 외부 보고서를 생성할 수 있습니다.
            Airtable에 다음 테이블이 있어야 합니다: Students, Tests, Test Results
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              연동 설정
            </CardTitle>
            <CardDescription>
              Airtable API 키와 Base ID를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="keyXXXXXXXXXXXXXX"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-airtable-api-key"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Airtable 계정 설정에서 API 키를 생성하세요
              </p>
            </div>

            <div>
              <Label htmlFor="base-id">Base ID</Label>
              <Input
                id="base-id"
                placeholder="appXXXXXXXXXXXXXX"
                value={baseId}
                onChange={(e) => setBaseId(e.target.value)}
                data-testid="input-airtable-base-id"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Airtable Base URL에서 Base ID를 찾을 수 있습니다
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSync} 
                disabled={syncMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-sync-to-airtable"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Airtable로 내보내기
              </Button>

              <Button 
                onClick={handleFetch} 
                disabled={fetchMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-fetch-from-airtable"
              >
                {fetchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Airtable에서 가져오기
              </Button>
            </div>
          </CardContent>
        </Card>

        {syncResult && (
          <Card className="mb-6" data-testid="sync-result-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                동기화 완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">학생</p>
                  <p className="text-2xl font-bold">{syncResult.synced?.students || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">시험</p>
                  <p className="text-2xl font-bold">{syncResult.synced?.tests || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">성적</p>
                  <p className="text-2xl font-bold">{syncResult.synced?.results || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {fetchResult && (
          <Card data-testid="fetch-result-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Download className="h-5 w-5" />
                가져오기 완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">학생 데이터</p>
                    <p className="text-2xl font-bold">{fetchResult.data?.students?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">성적 데이터</p>
                    <p className="text-2xl font-bold">{fetchResult.data?.results?.length || 0}</p>
                  </div>
                </div>

                {fetchResult.data?.students?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">학생 샘플:</p>
                    <div className="flex flex-wrap gap-2">
                      {fetchResult.data.students.slice(0, 5).map((student: any, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {student.Name || student['Student ID']}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>사용 방법</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="font-medium">Airtable 설정</p>
                <p className="text-sm text-gray-600">Airtable에서 새 Base를 만들고 Students, Tests, Test Results 테이블을 생성하세요</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="font-medium">API 키 발급</p>
                <p className="text-sm text-gray-600">Airtable 계정 설정에서 API 키를 생성하고 위에 입력하세요</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <p className="font-medium">데이터 동기화</p>
                <p className="text-sm text-gray-600">"Airtable로 내보내기" 버튼을 클릭하여 현재 데이터를 Airtable에 백업하세요</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

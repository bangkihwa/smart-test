import { SolapiMessageService } from 'solapi';
import type { SmsSettings } from '@shared/schema';

// 솔라피 메시지 서비스 초기화
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

// 발신번호 (솔라피에 등록된 번호)
const SENDER_PHONE = process.env.SOLAPI_SENDER_PHONE || '';

interface TestResultSMS {
  studentName: string;
  testName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  sectionScores: Array<{
    sectionNumber: number;
    sectionName?: string;
    correct: number;
    total: number;
    wrongAnswers: number[];
  }>;
  assignedTasks: Array<{
    sectionNumber: number;
    sectionName?: string;
    taskType: 'light' | 'medium' | 'heavy';
    task: string;
  }>;
  completedAt: Date;
  smsSettings?: SmsSettings | null;
}

// 기본 SMS 설정값
const DEFAULT_SMS_SETTINGS = {
  scoreMessage90: '훌륭합니다!',
  scoreMessage80: '잘했어요!',
  scoreMessage70: '조금만 더 노력하면 완벽해요!',
  scoreMessage60: '조금 더 복습이 필요해요.',
  scoreMessageBelow: '열심히 복습해주세요!',
  sectionFeedback90: '우수',
  sectionFeedback80: '양호',
  sectionFeedback70: '보통',
  sectionFeedback60: '노력',
  sectionFeedbackBelow: '복습필요',
  taskTypeLight: '기본',
  taskTypeMedium: '보충',
  taskTypeHeavy: '심화',
  defaultTaskLight: '시험지에 오답문제 정리해오기',
  defaultTaskMedium: '수업노트 필기 다시하고 오답문제 정리하기',
  defaultTaskHeavy: '동영상 수업 내용복습, 수업노트 필기, 오답정리해오기',
  academyName: '목동에이원과학학원',
};

// 점수에 따른 평가 메시지
function getScoreMessage(score: number, settings?: SmsSettings | null): string {
  const s = settings || DEFAULT_SMS_SETTINGS;
  if (score >= 90) return s.scoreMessage90 || DEFAULT_SMS_SETTINGS.scoreMessage90;
  if (score >= 80) return s.scoreMessage80 || DEFAULT_SMS_SETTINGS.scoreMessage80;
  if (score >= 70) return s.scoreMessage70 || DEFAULT_SMS_SETTINGS.scoreMessage70;
  if (score >= 60) return s.scoreMessage60 || DEFAULT_SMS_SETTINGS.scoreMessage60;
  return s.scoreMessageBelow || DEFAULT_SMS_SETTINGS.scoreMessageBelow;
}

// 파트별 점수에 따른 한단어 피드백
function getSectionFeedback(percentage: number, settings?: SmsSettings | null): string {
  const s = settings || DEFAULT_SMS_SETTINGS;
  if (percentage >= 90) return s.sectionFeedback90 || DEFAULT_SMS_SETTINGS.sectionFeedback90;
  if (percentage >= 80) return s.sectionFeedback80 || DEFAULT_SMS_SETTINGS.sectionFeedback80;
  if (percentage >= 70) return s.sectionFeedback70 || DEFAULT_SMS_SETTINGS.sectionFeedback70;
  if (percentage >= 60) return s.sectionFeedback60 || DEFAULT_SMS_SETTINGS.sectionFeedback60;
  return s.sectionFeedbackBelow || DEFAULT_SMS_SETTINGS.sectionFeedbackBelow;
}

// 과제 유형 한글명
function getTaskTypeName(taskType: string, settings?: SmsSettings | null): string {
  const s = settings || DEFAULT_SMS_SETTINGS;
  switch (taskType) {
    case 'light': return s.taskTypeLight || DEFAULT_SMS_SETTINGS.taskTypeLight;
    case 'medium': return s.taskTypeMedium || DEFAULT_SMS_SETTINGS.taskTypeMedium;
    case 'heavy': return s.taskTypeHeavy || DEFAULT_SMS_SETTINGS.taskTypeHeavy;
    default: return s.taskTypeLight || DEFAULT_SMS_SETTINGS.taskTypeLight;
  }
}

// 기본 과제 텍스트 가져오기 (테스트별 과제가 비어있을 때 사용)
function getDefaultTask(taskType: string, settings?: SmsSettings | null): string {
  const s = settings || DEFAULT_SMS_SETTINGS;
  switch (taskType) {
    case 'light': return s.defaultTaskLight || DEFAULT_SMS_SETTINGS.defaultTaskLight;
    case 'medium': return s.defaultTaskMedium || DEFAULT_SMS_SETTINGS.defaultTaskMedium;
    case 'heavy': return s.defaultTaskHeavy || DEFAULT_SMS_SETTINGS.defaultTaskHeavy;
    default: return s.defaultTaskLight || DEFAULT_SMS_SETTINGS.defaultTaskLight;
  }
}

// 시험 결과 SMS 메시지 생성
export function generateTestResultMessage(result: TestResultSMS): string {
  const date = new Date(result.completedAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
  const settings = result.smsSettings;
  const academyName = settings?.academyName || DEFAULT_SMS_SETTINGS.academyName;

  // LMS (장문 문자) 형식으로 작성
  let message = `[${academyName} 성적알림]

${result.studentName} 학생
${result.testName} 결과

${dateStr} 테스트 결과
총점: ${result.score}점
정답: ${result.correctAnswers}/${result.totalQuestions}문항
${getScoreMessage(result.score, settings)}

[파트별 성적]
`;

  // 섹션별 점수 (오답 제외, 한단어 피드백)
  result.sectionScores.forEach((section) => {
    const sectionName = section.sectionName || `파트${section.sectionNumber}`;
    const percentage = Math.round((section.correct / section.total) * 100);
    const feedback = getSectionFeedback(percentage, settings);
    message += `${sectionName}: ${section.correct}/${section.total} (${feedback})\n`;
  });

  // 보충 과제 안내
  const tasksWithWork = result.assignedTasks.map(t => ({
    ...t,
    // 테스트에서 과제가 비어있으면 기본 과제 사용
    task: (t.task && t.task.trim() !== '') ? t.task : getDefaultTask(t.taskType, settings)
  })).filter(t => t.task && t.task.trim() !== '');

  if (tasksWithWork.length > 0) {
    message += '\n[보충 과제]\n';
    tasksWithWork.forEach(task => {
      const sectionName = task.sectionName || `파트${task.sectionNumber}`;
      message += `${sectionName}(${getTaskTypeName(task.taskType, settings)}): ${task.task}\n`;
    });
  }

  message += `\n문의: ${academyName}`;

  return message;
}

// SMS 발송 함수
export async function sendTestResultSMS(
  parentPhone: string,
  result: TestResultSMS
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // 환경변수 체크
  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
    console.log('[SMS] 솔라피 API 키가 설정되지 않았습니다. 문자 발송 건너뜀.');
    return { success: false, error: 'SOLAPI API keys not configured' };
  }

  if (!SENDER_PHONE) {
    console.log('[SMS] 발신번호가 설정되지 않았습니다.');
    return { success: false, error: 'Sender phone not configured' };
  }

  if (!parentPhone) {
    console.log('[SMS] 수신번호가 없습니다.');
    return { success: false, error: 'No recipient phone number' };
  }

  // 전화번호 정규화 (하이픈 제거)
  const normalizedPhone = parentPhone.replace(/-/g, '');

  // 전화번호 유효성 검사
  if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
    console.log('[SMS] 유효하지 않은 전화번호:', normalizedPhone);
    return { success: false, error: 'Invalid phone number format' };
  }

  const message = generateTestResultMessage(result);

  try {
    console.log(`[SMS] 문자 발송 시도: ${normalizedPhone}`);
    console.log(`[SMS] 메시지 길이: ${message.length}자`);

    const response = await messageService.send({
      to: normalizedPhone,
      from: SENDER_PHONE,
      text: message,
    });

    console.log('[SMS] 발송 성공:', response);
    return {
      success: true,
      messageId: response.groupId || 'sent'
    };
  } catch (error: any) {
    console.error('[SMS] 발송 실패:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}

// 테스트용 SMS 발송
export async function sendTestSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET || !SENDER_PHONE) {
    return { success: false, error: 'SMS service not configured' };
  }

  const normalizedPhone = phone.replace(/-/g, '');

  try {
    await messageService.send({
      to: normalizedPhone,
      from: SENDER_PHONE,
      text: message,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

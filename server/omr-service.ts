import sharp from 'sharp';
import jsQR from 'jsqr';

// OMR 인식 결과 타입
export interface OMRScanResult {
  success: boolean;
  testId: string | null;  // test.id (UUID)
  studentId: string | null;  // h12345 또는 m12345 형식
  answers: number[];
  confidence: number;
  errors: string[];
  details?: {
    qrConfidence: number;
    studentIdConfidence: number;
    answerConfidences: number[];
  };
}

// PDF와 동일한 설정 (mm to px @ 300dpi: mm * 300 / 25.4)
const mmToPx = (mm: number) => Math.round(mm * 300 / 25.4);

const OMR_CONFIG = {
  pageWidth: mmToPx(210),  // A4
  pageHeight: mmToPx(297),
  margin: mmToPx(15),

  // 학번: Type(h/m) 버블 위치
  typeY: mmToPx(15 + 40 + 8),  // margin + 40 + 8
  hBubbleX: mmToPx(15 + 23),
  mBubbleX: mmToPx(15 + 37),

  // 학번: 숫자 5자리 버블
  digitStartY: mmToPx(15 + 40 + 18),  // margin + 40 + 8 + 10
  digitRowHeight: mmToPx(6.5),
  digitColStart: mmToPx(15 + 13),
  digitColWidth: mmToPx(7),

  // 답안 영역
  answerStartY: mmToPx(15 + 40 + 45 + 12),  // margin + studentId area + name + gap
  sectionHeight: mmToPx(38),
  sectionHeaderHeight: mmToPx(8),
  answerRowHeight: mmToPx(5.5),
  answerColStart: mmToPx(15 + 12),
  answerColWidth: mmToPx(17),

  bubbleRadius: mmToPx(2.5),
  bubbleThreshold: 0.30,
};

export class OMRProcessor {

  async preprocessImage(imageBuffer: Buffer): Promise<{
    width: number;
    height: number;
    rawPixels: Uint8ClampedArray;
  }> {
    const processed = await sharp(imageBuffer)
      .grayscale()
      .resize(OMR_CONFIG.pageWidth, OMR_CONFIG.pageHeight, { fit: 'fill' })
      .raw()
      .toBuffer();

    return {
      width: OMR_CONFIG.pageWidth,
      height: OMR_CONFIG.pageHeight,
      rawPixels: new Uint8ClampedArray(processed)
    };
  }

  // QR 코드에서 test.id 읽기
  async readQRCode(imageBuffer: Buffer): Promise<{ testId: string | null; confidence: number }> {
    try {
      // QR 영역 추출
      const qrRegion = await sharp(imageBuffer)
        .extract({
          left: OMR_CONFIG.margin,
          top: OMR_CONFIG.margin,
          width: mmToPx(30),
          height: mmToPx(30)
        })
        .resize(300, 300)
        .grayscale()
        .raw()
        .toBuffer();

      // RGBA로 변환
      const rgba = new Uint8ClampedArray(300 * 300 * 4);
      for (let i = 0; i < 300 * 300; i++) {
        rgba[i * 4] = qrRegion[i];
        rgba[i * 4 + 1] = qrRegion[i];
        rgba[i * 4 + 2] = qrRegion[i];
        rgba[i * 4 + 3] = 255;
      }

      const qrResult = jsQR(rgba, 300, 300);
      if (qrResult) {
        try {
          const data = JSON.parse(qrResult.data);
          return { testId: data.id || null, confidence: 1.0 };
        } catch {
          return { testId: null, confidence: 0 };
        }
      }
      return { testId: null, confidence: 0 };
    } catch (e) {
      console.error('QR read error:', e);
      return { testId: null, confidence: 0 };
    }
  }

  // 학번 읽기: h/m + 5자리 숫자
  async readStudentId(imageBuffer: Buffer): Promise<{ studentId: string | null; confidence: number }> {
    try {
      const { rawPixels, width } = await this.preprocessImage(imageBuffer);

      // 1. Type 읽기 (h 또는 m)
      const hFill = this.measureBubbleFill(rawPixels, width, OMR_CONFIG.hBubbleX, OMR_CONFIG.typeY, OMR_CONFIG.bubbleRadius);
      const mFill = this.measureBubbleFill(rawPixels, width, OMR_CONFIG.mBubbleX, OMR_CONFIG.typeY, OMR_CONFIG.bubbleRadius);

      let prefix = '';
      let typeConfidence = 0;

      if (hFill > mFill && hFill > OMR_CONFIG.bubbleThreshold) {
        prefix = 'h';
        typeConfidence = hFill;
      } else if (mFill > hFill && mFill > OMR_CONFIG.bubbleThreshold) {
        prefix = 'm';
        typeConfidence = mFill;
      } else {
        return { studentId: null, confidence: 0 };
      }

      // 2. 5자리 숫자 읽기
      let digits = '';
      let totalConfidence = typeConfidence;

      for (let d = 0; d < 5; d++) {
        const rowY = OMR_CONFIG.digitStartY + d * OMR_CONFIG.digitRowHeight;
        let maxFill = 0;
        let selectedNum = 0;

        for (let n = 0; n <= 9; n++) {
          const colX = OMR_CONFIG.digitColStart + n * OMR_CONFIG.digitColWidth;
          const fill = this.measureBubbleFill(rawPixels, width, colX, rowY, OMR_CONFIG.bubbleRadius);
          if (fill > maxFill) {
            maxFill = fill;
            selectedNum = n;
          }
        }

        if (maxFill > OMR_CONFIG.bubbleThreshold) {
          digits += String(selectedNum);
          totalConfidence += maxFill;
        } else {
          digits += '0';
        }
      }

      const studentId = prefix + digits;
      return {
        studentId: studentId.length === 6 ? studentId : null,
        confidence: totalConfidence / 6
      };
    } catch (e) {
      console.error('Student ID read error:', e);
      return { studentId: null, confidence: 0 };
    }
  }

  // 30문항 답안 읽기
  async readAnswers(imageBuffer: Buffer): Promise<{ answers: number[]; confidences: number[] }> {
    try {
      const { rawPixels, width } = await this.preprocessImage(imageBuffer);

      const answers: number[] = [];
      const confidences: number[] = [];

      for (let sec = 0; sec < 3; sec++) {
        // 섹션 시작 Y
        const sectionY = OMR_CONFIG.answerStartY + sec * (OMR_CONFIG.sectionHeight + OMR_CONFIG.sectionHeaderHeight + 5);
        const rowStartY = sectionY + OMR_CONFIG.sectionHeaderHeight + mmToPx(5);

        for (let q = 0; q < 10; q++) {
          const colX = OMR_CONFIG.answerColStart + q * OMR_CONFIG.answerColWidth;
          let maxFill = 0;
          let selectedChoice = 0;

          for (let choice = 1; choice <= 5; choice++) {
            const rowY = rowStartY + choice * OMR_CONFIG.answerRowHeight;
            const fill = this.measureBubbleFill(rawPixels, width, colX, rowY, OMR_CONFIG.bubbleRadius);
            if (fill > maxFill) {
              maxFill = fill;
              selectedChoice = choice;
            }
          }

          if (maxFill > OMR_CONFIG.bubbleThreshold) {
            answers.push(selectedChoice);
            confidences.push(maxFill);
          } else {
            answers.push(0);
            confidences.push(0);
          }
        }
      }

      return { answers, confidences };
    } catch (e) {
      console.error('Answer read error:', e);
      return { answers: new Array(30).fill(0), confidences: new Array(30).fill(0) };
    }
  }

  private measureBubbleFill(
    pixels: Uint8ClampedArray,
    imageWidth: number,
    centerX: number,
    centerY: number,
    radius: number
  ): number {
    let darkPixels = 0;
    let totalPixels = 0;

    const r = Math.floor(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const x = Math.floor(centerX + dx);
          const y = Math.floor(centerY + dy);
          if (x >= 0 && x < imageWidth && y >= 0) {
            totalPixels++;
            const idx = y * imageWidth + x;
            if (pixels[idx] < 128) {
              darkPixels++;
            }
          }
        }
      }
    }

    return totalPixels > 0 ? darkPixels / totalPixels : 0;
  }

  async processOMRSheet(imageBuffer: Buffer): Promise<OMRScanResult> {
    const errors: string[] = [];

    const qrResult = await this.readQRCode(imageBuffer);
    if (!qrResult.testId) {
      errors.push('QR code not recognized');
    }

    const studentResult = await this.readStudentId(imageBuffer);
    if (!studentResult.studentId) {
      errors.push('Student ID not recognized');
    }

    const answerResult = await this.readAnswers(imageBuffer);
    const unanswered = answerResult.answers.filter(a => a === 0).length;
    if (unanswered > 0) {
      errors.push(`${unanswered} questions not marked`);
    }

    const avgAnswerConf = answerResult.confidences.reduce((a, b) => a + b, 0) / 30;
    const overallConf = (qrResult.confidence + studentResult.confidence + avgAnswerConf) / 3;

    return {
      success: errors.length === 0,
      testId: qrResult.testId,
      studentId: studentResult.studentId,
      answers: answerResult.answers,
      confidence: overallConf,
      errors,
      details: {
        qrConfidence: qrResult.confidence,
        studentIdConfidence: studentResult.confidence,
        answerConfidences: answerResult.confidences
      }
    };
  }
}

export const omrProcessor = new OMRProcessor();

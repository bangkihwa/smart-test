import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { Test } from "@/lib/types";

interface OMRSheetGeneratorProps {
  test: Test;
}

export default function OMRSheetGenerator({ test }: OMRSheetGeneratorProps) {
  const [copies, setCopies] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const generateOMRSheet = async () => {
    setIsGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      for (let copy = 0; copy < copies; copy++) {
        if (copy > 0) {
          pdf.addPage();
        }
        await drawOMRPage(pdf, test);
      }

      pdf.save(`OMR_${test.id.substring(0, 8)}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          OMR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>OMR 답안지 출력</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>테스트</Label>
            <p className="text-sm font-medium">{test.name}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="copies">출력 부수</Label>
            <Input
              id="copies"
              type="number"
              min={1}
              max={50}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            />
          </div>
          <Button
            onClick={generateOMRSheet}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? "생성 중..." : `PDF 다운로드 (${copies}부)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// PDF 페이지 그리기
async function drawOMRPage(pdf: jsPDF, test: Test) {
  const margin = 15;
  const width = 210;
  const height = 297;

  // 코너 마커 (4개)
  pdf.setFillColor(0, 0, 0);
  const m = 6;
  pdf.rect(margin, margin, m, m, 'F');
  pdf.rect(width - margin - m, margin, m, m, 'F');
  pdf.rect(margin, height - margin - m, m, m, 'F');
  pdf.rect(width - margin - m, height - margin - m, m, m, 'F');

  // QR 코드 (테스트 ID를 uuid 형식으로)
  const qrData = JSON.stringify({ id: test.id });
  try {
    const qrUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 });
    pdf.addImage(qrUrl, 'PNG', margin + 8, margin + 8, 22, 22);
  } catch (e) {
    // QR 실패시 무시
  }

  // 타이틀 - 영어만 사용
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("AONE SMART TEST", margin + 35, margin + 18);

  pdf.setFontSize(12);
  pdf.text("OMR ANSWER SHEET", margin + 35, margin + 26);

  // 학번 영역 - 알파벳 1자리 + 숫자 5자리 (h12345 또는 m12345)
  let y = margin + 40;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("STUDENT ID", margin, y);

  y += 8;

  // 첫 글자: h 또는 m 선택
  pdf.setFontSize(8);
  pdf.text("Type:", margin, y + 2);

  // h 버블
  pdf.setFont("helvetica", "normal");
  pdf.text("h", margin + 18, y + 2);
  drawBubble(pdf, margin + 23, y, 2.5);

  // m 버블
  pdf.text("m", margin + 32, y + 2);
  drawBubble(pdf, margin + 37, y, 2.5);

  y += 10;

  // 숫자 5자리 버블
  pdf.setFontSize(7);

  // 헤더 (0-9)
  for (let n = 0; n <= 9; n++) {
    pdf.text(String(n), margin + 12 + n * 7, y);
  }

  // 5자리 숫자 버블
  for (let digit = 0; digit < 5; digit++) {
    const rowY = y + 5 + digit * 6.5;
    pdf.text(String(digit + 1), margin + 3, rowY + 1.5);

    for (let n = 0; n <= 9; n++) {
      drawBubble(pdf, margin + 13 + n * 7, rowY, 2.5);
    }
  }

  // 이름란
  y += 45;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("NAME:", margin, y);
  pdf.setLineWidth(0.3);
  pdf.line(margin + 18, y, margin + 80, y);

  // 답안 영역
  y += 12;

  for (let sec = 0; sec < 3; sec++) {
    const startQ = sec * 10 + 1;
    const endQ = sec * 10 + 10;

    // 섹션 헤더
    pdf.setFillColor(235, 235, 235);
    pdf.rect(margin, y - 3, width - margin * 2, 7, 'F');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(0);
    pdf.text(`SECTION ${sec + 1}  (Q${startQ} - Q${endQ})`, margin + 3, y + 1);

    y += 8;

    // 문항 번호
    pdf.setFontSize(8);
    for (let q = 0; q < 10; q++) {
      const qNum = sec * 10 + q + 1;
      const x = margin + 12 + q * 17;
      pdf.text(String(qNum), x, y);
    }

    y += 5;

    // 5개 선택지
    for (let choice = 1; choice <= 5; choice++) {
      const rowY = y + choice * 5.5;

      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(String(choice), margin + 4, rowY + 1);

      for (let q = 0; q < 10; q++) {
        const x = margin + 12 + q * 17;
        drawBubble(pdf, x, rowY, 2.5);
      }
    }

    y += 38;
  }

  // 하단 안내
  pdf.setFontSize(7);
  pdf.setTextColor(100);
  pdf.text("* Fill bubbles completely with dark pen", margin, height - margin - 2);
  pdf.setTextColor(0);
}

function drawBubble(pdf: jsPDF, x: number, y: number, r: number) {
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.2);
  pdf.circle(x, y, r, 'S');
}

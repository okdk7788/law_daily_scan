const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, PageBreak, AlignmentType,
  BorderStyle, WidthType, ShadingType, LevelFormat, HeadingLevel
} = require('docx');

// ── Data ──────────────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync('daily_data.json', 'utf8'));

// ── Constants ─────────────────────────────────────────────────────────
const FONT = 'Malgun Gothic';
const COLOR_NAVY = '1B3A5C';
const COLOR_ACCENT = '2E75B6';
const COLOR_RED = 'B30000';
const COLOR_GREEN_HEADER = 'E6F2EA';
const COLOR_RED_HEADER = 'FFE6E6';
const COLOR_AMBER = 'FFF8E1';
const COLOR_AMBER_ACCENT = 'F9A825';
const COLOR_GRAY_LIGHT = 'F5F5F5';
const COLOR_GRAY_TEXT = '999999';
const COLOR_WHITE = 'FFFFFF';
const COLOR_ROW_ALT = 'F0F4F8';

const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Helpers ───────────────────────────────────────────────────────────
const border = (color = 'CCCCCC', size = 1) => ({ style: BorderStyle.SINGLE, size, color });
const borders = (color = 'CCCCCC', size = 1) => ({
  top: border(color, size), bottom: border(color, size),
  left: border(color, size), right: border(color, size)
});
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function textParagraphs(text, opts = {}) {
  if (!text) return [];
  const { size = 22, color, bold, spacing = { after: 100 }, font = FONT } = opts;
  return text.split('\n')
    .filter(l => l.trim().length > 0)
    .map(line => new Paragraph({
      spacing,
      children: [new TextRun({ text: line.trim(), font, size, color, bold })]
    }));
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

function horizontalDivider(color = COLOR_ACCENT) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
    children: []
  });
}

function emptyPara(before = 0, after = 0) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

// ── Section 1: Cover + Summary ────────────────────────────────────────
function buildCoverSection() {
  const children = [];

  children.push(emptyPara(1200, 0));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: '일일 법령 및 행정규칙 제·개정 보고서', font: FONT, size: 48, bold: true, color: COLOR_NAVY })]
  }));

  children.push(horizontalDivider(COLOR_ACCENT));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 60 },
    children: [new TextRun({ text: formatDate(data.date), font: FONT, size: 28, color: COLOR_GRAY_TEXT })]
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 400 },
    children: [new TextRun({ text: `총 ${data.laws.length}건의 제·개정 사항`, font: FONT, size: 22, color: COLOR_ACCENT })]
  }));

  children.push(new Paragraph({
    spacing: { before: 200, after: 160 },
    children: [new TextRun({ text: '법령 개정 요약', font: FONT, size: 32, bold: true, color: COLOR_NAVY })]
  }));

  const headerBorder = border(COLOR_NAVY, 1);
  const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

  const summaryHeaderRow = new TableRow({
    children: ['순번', '개정 법령명', '구분'].map((label, i) => {
      const widths = [800, 6560, 2000];
      return new TableCell({
        borders: headerBorders,
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: COLOR_NAVY, type: ShadingType.CLEAR },
        margins: cellMargins,
        verticalAlign: 'center',
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: label, bold: true, font: FONT, size: 20, color: COLOR_WHITE })]
        })]
      });
    })
  });

  const summaryDataRows = data.laws.map((law, idx) => {
    const bgColor = idx % 2 === 0 ? COLOR_WHITE : COLOR_ROW_ALT;
    return new TableRow({
      children: [
        new TableCell({
          borders: borders('D0D0D0', 1),
          width: { size: 800, type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: cellMargins,
          verticalAlign: 'center',
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), font: FONT, size: 20 })] })]
        }),
        new TableCell({
          borders: borders('D0D0D0', 1),
          width: { size: 6560, type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: cellMargins,
          verticalAlign: 'center',
          children: [new Paragraph({ children: [new TextRun({ text: law.name, font: FONT, size: 20 })] })]
        }),
        new TableCell({
          borders: borders('D0D0D0', 1),
          width: { size: 2000, type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: cellMargins,
          verticalAlign: 'center',
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: law.type, font: FONT, size: 20 })] })]
        })
      ]
    });
  });

  children.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [800, 6560, 2000],
    rows: [summaryHeaderRow, ...summaryDataRows]
  }));

  return children;
}

// ── Section 2: Detail Pages ───────────────────────────────────────────
function buildDetailSection() {
  const children = [];

  data.laws.forEach((law, idx) => {
    const typeLabel = law.type || '';

    if (idx > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    children.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [CONTENT_W],
      rows: [new TableRow({
        children: [new TableCell({
          borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_NAVY },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_NAVY },
            left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_NAVY },
            right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_NAVY },
          },
          width: { size: CONTENT_W, type: WidthType.DXA },
          shading: { fill: COLOR_NAVY, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 200, right: 200 },
          children: [
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: `[${idx+1}] ${law.name}`, font: FONT, size: 28, bold: true, color: COLOR_WHITE })]
            }),
            new Paragraph({
              children: [new TextRun({ text: `${typeLabel}  |  법령번호 ${law.id || '-'}`, font: FONT, size: 18, color: 'B0C4DE' })]
            })
          ]
        })]
      })]
    }));

    children.push(emptyPara(120, 0));

    // ── AI Summary Callout Box ──
    if (law.llm_summary) {
      const summaryContent = [];

      if (law.llm_summary.target_audience) {
        summaryContent.push(new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: '🎯 핵심 적용 대상', font: FONT, size: 22, bold: true, color: COLOR_NAVY }),
          ]
        }));
        summaryContent.push(new Paragraph({
          numbering: { reference: 'summaryBullets', level: 0 },
          spacing: { after: 120 },
          children: [new TextRun({ text: law.llm_summary.target_audience, font: FONT, size: 22 })]
        }));
      }

      if (Array.isArray(law.llm_summary.changes) && law.llm_summary.changes.length > 0) {
        summaryContent.push(new Paragraph({
          spacing: { before: 60, after: 80 },
          children: [new TextRun({ text: '⚖️ 주요 변경 사항', font: FONT, size: 22, bold: true, color: COLOR_NAVY })]
        }));
        law.llm_summary.changes.forEach(change => {
            const lines = change.split('\n').map(s => s.trim()).filter(Boolean);
            const runChildren = [];
            lines.forEach((line, li) => {
              // [변경] 문자열만 정확히 찾아 볼드 처리
              if (line.includes('[변경]')) {
                const parts = line.split(/(\[변경\])/);
                parts.forEach(part => {
                  if (part) {
                    runChildren.push(new TextRun({ 
                      text: part, 
                      font: FONT, 
                      size: 20, 
                      bold: part === '[변경]' 
                    }));
                  }
                });
              } else {
                const startsWithArrow = line.startsWith('->') || line.startsWith('➡️') || line.startsWith('▶');
                runChildren.push(new TextRun({ 
                  text: line, 
                  font: FONT, 
                  size: 20, 
                  bold: startsWithArrow 
                }));
              }
              
              if (li < lines.length - 1) {
                runChildren.push(new TextRun({ break: 1 }));
              }
            });
            summaryContent.push(new Paragraph({
              numbering: { reference: 'summaryBullets', level: 0 },
              spacing: { after: 80 },
              children: runChildren
            }));
        });
      }

      if (Array.isArray(law.llm_summary.action_items) && law.llm_summary.action_items.length > 0) {
        summaryContent.push(new Paragraph({
          spacing: { before: 60, after: 80 },
          children: [new TextRun({ text: '🚨 실무적 영향', font: FONT, size: 22, bold: true, color: COLOR_NAVY })]
        }));
        law.llm_summary.action_items.forEach(action => {
          summaryContent.push(new Paragraph({
            numbering: { reference: 'summaryBullets', level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: action, font: FONT, size: 20 })]
          }));
        });
      }

      children.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [120, CONTENT_W - 120],
        rows: [new TableRow({
          children: [
            new TableCell({
              borders: noBorders,
              width: { size: 120, type: WidthType.DXA },
              shading: { fill: COLOR_AMBER_ACCENT, type: ShadingType.CLEAR },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [emptyPara(0, 0)]
            }),
            new TableCell({
              borders: noBorders,
              width: { size: CONTENT_W - 120, type: WidthType.DXA },
              shading: { fill: COLOR_AMBER, type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: '✨ AI 핵심 요약', font: FONT, size: 24, bold: true, color: COLOR_AMBER_ACCENT })]
                }),
                ...summaryContent
              ]
            })
          ]
        })]
      }));

      children.push(emptyPara(120, 0));
    }

    children.push(horizontalDivider(COLOR_ACCENT));
    children.push(new Paragraph({
      spacing: { before: 80, after: 120 },
      children: [new TextRun({ text: '제·개정 이유', font: FONT, size: 26, bold: true, color: COLOR_ACCENT })]
    }));

    if (law.reason) {
      const reasonLines = law.reason.split('\n').filter(l => l.trim().length > 0);
      reasonLines.forEach(line => {
        if (line.trim().startsWith('◇')) {
          children.push(new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: line.trim(), font: FONT, size: 22, bold: true, color: COLOR_NAVY })]
          }));
        } else {
          children.push(new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: line.trim(), font: FONT, size: 22 })]
          }));
        }
      });
    }

    children.push(emptyPara(100, 0));

    children.push(horizontalDivider(COLOR_RED));
    children.push(new Paragraph({
      spacing: { before: 80, after: 120 },
      children: [new TextRun({ text: '개정 조문 내용', font: FONT, size: 26, bold: true, color: COLOR_RED })]
    }));

    const revText = law.revision_text;
    if (!revText || revText === 'No revision text available.') {
      children.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: '제공된 조문 내용이 없습니다.', font: FONT, size: 20, color: COLOR_GRAY_TEXT, italics: true })]
      }));
    } else {
      const revLines = revText.split('\n').filter(l => l.trim().length > 0);
      revLines.forEach(line => {
        children.push(new Paragraph({
          spacing: { after: 60, line: 312 },
          children: [new TextRun({ text: line.trim(), font: FONT, size: 20 })]
        }));
      });
    }

    children.push(emptyPara(100, 0));

    if (law.comparison && law.comparison.length > 0) {
      children.push(horizontalDivider('2E7D32'));
      children.push(new Paragraph({
        spacing: { before: 80, after: 120 },
        children: [new TextRun({ text: '신구 조문 대비표', font: FONT, size: 26, bold: true, color: '2E7D32' })]
      }));

      const compColW = Math.floor(CONTENT_W / 2);
      const compHeaderRow = new TableRow({
        children: [
          new TableCell({
            borders: borders('2E7D32', 1),
            width: { size: compColW, type: WidthType.DXA },
            shading: { fill: COLOR_GREEN_HEADER, type: ShadingType.CLEAR },
            margins: cellMargins,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '개정 전 (현행)', font: FONT, size: 20, bold: true, color: '2E7D32' })]
            })]
          }),
          new TableCell({
            borders: borders('C62828', 1),
            width: { size: compColW, type: WidthType.DXA },
            shading: { fill: COLOR_RED_HEADER, type: ShadingType.CLEAR },
            margins: cellMargins,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '개정 후', font: FONT, size: 20, bold: true, color: 'C62828' })]
            })]
          })
        ]
      });

      const compDataRows = [];
      law.comparison.forEach(comp => {
        const oldText = comp.old || '';
        const newText = comp.new || '';
        const isUnchanged = oldText === newText
          || newText.includes('현행과 같음')
          || newText.includes('생략')
          || (oldText.trim() === '' && newText.trim() === '');

        const bgColor = isUnchanged ? COLOR_GRAY_LIGHT : COLOR_WHITE;
        const textColor = isUnchanged ? COLOR_GRAY_TEXT : '333333';

        const oldParas = oldText.split('\n').filter(l => l.trim()).map(l =>
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: l.trim(), font: FONT, size: 18, color: textColor })] })
        );
        const newParas = newText.split('\n').filter(l => l.trim()).map(l =>
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: l.trim(), font: FONT, size: 18, color: textColor })] })
        );

        if (oldParas.length === 0) oldParas.push(new Paragraph({ children: [new TextRun({ text: '-', font: FONT, size: 18, color: COLOR_GRAY_TEXT })] }));
        if (newParas.length === 0) newParas.push(new Paragraph({ children: [new TextRun({ text: '-', font: FONT, size: 18, color: COLOR_GRAY_TEXT })] }));

        compDataRows.push(new TableRow({
          children: [
            new TableCell({
              borders: borders('D0D0D0', 1),
              width: { size: compColW, type: WidthType.DXA },
              shading: { fill: bgColor, type: ShadingType.CLEAR },
              margins: cellMargins,
              children: oldParas
            }),
            new TableCell({
              borders: borders('D0D0D0', 1),
              width: { size: compColW, type: WidthType.DXA },
              shading: { fill: bgColor, type: ShadingType.CLEAR },
              margins: cellMargins,
              children: newParas
            })
          ]
        }));
      });

      children.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [compColW, compColW],
        rows: [compHeaderRow, ...compDataRows]
      }));
    }
  });

  return children;
}

// ── Build Document ────────────────────────────────────────────────────
const coverChildren = buildCoverSection();
const detailChildren = buildDetailSection();

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 44, bold: true, font: FONT, color: COLOR_NAVY },
        paragraph: { spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: COLOR_NAVY },
        paragraph: { spacing: { before: 200, after: 160 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: COLOR_ACCENT },
        paragraph: { spacing: { before: 160, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  numbering: {
    config: [
      {
        reference: 'summaryBullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 180 } } }
        }]
      },
    ]
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0', space: 4 } },
            children: [new TextRun({ text: '일일 법령 제·개정 보고서', font: FONT, size: 16, color: COLOR_GRAY_TEXT })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0', space: 4 } },
            children: [new TextRun({ text: '- ', font: FONT, size: 16, color: COLOR_GRAY_TEXT }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: COLOR_GRAY_TEXT }), new TextRun({ text: ' -', font: FONT, size: 16, color: COLOR_GRAY_TEXT })]
          })]
        })
      },
      children: coverChildren
    },
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0', space: 4 } },
            children: [new TextRun({ text: '일일 법령 제·개정 보고서', font: FONT, size: 16, color: COLOR_GRAY_TEXT })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0', space: 4 } },
            children: [new TextRun({ text: '- ', font: FONT, size: 16, color: COLOR_GRAY_TEXT }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: COLOR_GRAY_TEXT }), new TextRun({ text: ' -', font: FONT, size: 16, color: COLOR_GRAY_TEXT })]
          })]
        })
      },
      children: detailChildren
    }
  ]
});

const outPath = `output/${data.date}_개정법률보고서.docx`;
if (!fs.existsSync('output')) fs.mkdirSync('output');
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Document created successfully: ${outPath}`);
}).catch(e => {
  console.error('Failed to create document', e);
  process.exit(1);
});

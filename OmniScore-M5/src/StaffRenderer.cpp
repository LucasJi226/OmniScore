#include "StaffRenderer.h"

StaffRenderer::StaffRenderer() : measures(nullptr), measuresPerPage(4) {}

void StaffRenderer::setMeasures(std::vector<Measure>* m) {
    measures = m;
}

int StaffRenderer::getTotalPages() {
    if (!measures || measures->empty()) return 0;
    return (measures->size() + measuresPerPage - 1) / measuresPerPage;
}

void StaffRenderer::renderPage(int pageIndex) {
    M5.Lcd.fillScreen(WHITE);
    M5.Lcd.setTextColor(BLACK);
    
    if (!measures || measures->empty()) {
        M5.Lcd.setCursor(10, 100);
        M5.Lcd.setTextSize(2);
        M5.Lcd.println("No music loaded");
        return;
    }
    
    int startMeasure = pageIndex * measuresPerPage;
    int endMeasure = min(startMeasure + measuresPerPage, (int)measures->size());
    
    int staffY = 40;
    int staffSpacing = 50;
    
    for (int i = startMeasure; i < endMeasure; i++) {
        Measure& measure = (*measures)[i];
        
        // 绘制五线谱
        drawStaff(10, staffY, 300);
        
        // 绘制谱号（第一小节）
        if (i == startMeasure) {
            drawClef(15, staffY, true);
        }
        
        // 绘制拍号（第一小节）
        if (i == startMeasure) {
            drawTimeSignature(45, staffY, measure.beats, measure.beatType);
        }
        
        // 绘制音符
        int noteX = (i == startMeasure) ? 75 : 20;
        for (size_t j = 0; j < measure.notes.size(); j++) {
            drawNote(noteX, staffY, measure.notes[j]);
            noteX += 30;
        }
        
        // 绘制小节线
        M5.Lcd.drawLine(noteX + 5, staffY, noteX + 5, staffY + 32, BLACK);
        
        staffY += staffSpacing;
    }
    
    // 显示页码
    M5.Lcd.setCursor(10, 220);
    M5.Lcd.setTextSize(1);
    M5.Lcd.printf("Page %d/%d", pageIndex + 1, getTotalPages());
    M5.Lcd.setCursor(200, 220);
    M5.Lcd.println("Shake to turn page");
}

void StaffRenderer::drawStaff(int x, int y, int width) {
    for (int i = 0; i < 5; i++) {
        M5.Lcd.drawLine(x, y + i * 8, x + width, y + i * 8, BLACK);
    }
}

void StaffRenderer::drawClef(int x, int y, bool isTreble) {
    M5.Lcd.setTextSize(3);
    M5.Lcd.setCursor(x, y - 5);
    if (isTreble) {
        M5.Lcd.print("G"); // 简化的高音谱号
    } else {
        M5.Lcd.print("F"); // 简化的低音谱号
    }
    M5.Lcd.setTextSize(1);
}

void StaffRenderer::drawTimeSignature(int x, int y, int beats, int beatType) {
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(x, y + 2);
    M5.Lcd.print(beats);
    M5.Lcd.setCursor(x, y + 18);
    M5.Lcd.print(beatType);
    M5.Lcd.setTextSize(1);
}

void StaffRenderer::drawNote(int x, int y, const Note& note) {
    if (note.isRest) {
        // 绘制休止符
        M5.Lcd.fillRect(x, y + 12, 6, 8, BLACK);
        return;
    }
    
    int noteY = getNoteYPosition(note, y, true);
    
    // 绘制升降号
    if (note.alter != 0) {
        drawAccidental(x - 8, noteY, note.alter);
    }
    
    // 绘制符头
    drawNotehead(x, noteY, note.duration);
    
    // 绘制符干
    if (note.duration != NOTE_WHOLE) {
        bool stemUp = (noteY > y + 16);
        drawStem(x, noteY, stemUp);
    }
    
    // 绘制加线（如果需要）
    if (noteY < y) {
        for (int ly = y - 8; ly >= noteY; ly -= 8) {
            M5.Lcd.drawLine(x - 6, ly, x + 12, ly, BLACK);
        }
    } else if (noteY > y + 32) {
        for (int ly = y + 40; ly <= noteY; ly += 8) {
            M5.Lcd.drawLine(x - 6, ly, x + 12, ly, BLACK);
        }
    }
}

int StaffRenderer::getNoteYPosition(const Note& note, int staffY, bool isTreble) {
    // 计算音符在五线谱上的位置
    // C4 = 中央C
    int noteValue = 0;
    
    if (note.step == "C") noteValue = 0;
    else if (note.step == "D") noteValue = 1;
    else if (note.step == "E") noteValue = 2;
    else if (note.step == "F") noteValue = 3;
    else if (note.step == "G") noteValue = 4;
    else if (note.step == "A") noteValue = 5;
    else if (note.step == "B") noteValue = 6;
    
    int absoluteNote = note.octave * 7 + noteValue;
    int c4Position = 4 * 7; // C4的绝对位置
    
    // 高音谱表：C4在下加一线
    int offset = (c4Position - absoluteNote) * 4;
    return staffY + 40 + offset;
}

void StaffRenderer::drawNotehead(int x, int y, NoteType type) {
    if (type == NOTE_WHOLE || type == NOTE_HALF) {
        M5.Lcd.drawEllipse(x + 3, y, 5, 3, BLACK);
    } else {
        M5.Lcd.fillEllipse(x + 3, y, 5, 3, BLACK);
    }
}

void StaffRenderer::drawStem(int x, int y, bool up) {
    if (up) {
        M5.Lcd.drawLine(x + 8, y, x + 8, y - 24, BLACK);
    } else {
        M5.Lcd.drawLine(x - 2, y, x - 2, y + 24, BLACK);
    }
}

void StaffRenderer::drawAccidental(int x, int y, int alter) {
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(x, y - 6);
    if (alter > 0) {
        M5.Lcd.print("#");
    } else if (alter < 0) {
        M5.Lcd.print("b");
    }
    M5.Lcd.setTextSize(1);
}

#ifndef STAFF_RENDERER_H
#define STAFF_RENDERER_H

#include <M5Core2.h>
#include "MusicXMLParser.h"

class StaffRenderer {
public:
    StaffRenderer();
    void renderPage(int pageIndex);
    void setMeasures(std::vector<Measure>* measures);
    int getTotalPages();
    
private:
    std::vector<Measure>* measures;
    int measuresPerPage;
    
    void drawStaff(int x, int y, int width);
    void drawClef(int x, int y, bool isTreble);
    void drawNote(int x, int y, const Note& note);
    void drawTimeSignature(int x, int y, int beats, int beatType);
    int getNoteYPosition(const Note& note, int staffY, bool isTreble);
    void drawNotehead(int x, int y, NoteType type);
    void drawStem(int x, int y, bool up);
    void drawAccidental(int x, int y, int alter);
};

#endif

#ifndef MUSICXML_PARSER_H
#define MUSICXML_PARSER_H

#include <Arduino.h>
#include <vector>

enum NoteType {
    NOTE_WHOLE = 1,
    NOTE_HALF = 2,
    NOTE_QUARTER = 4,
    NOTE_EIGHTH = 8,
    NOTE_SIXTEENTH = 16
};

struct Note {
    String step;      // C, D, E, F, G, A, B
    int octave;       // 音高八度
    int alter;        // 升降号 (1=升, -1=降, 0=还原)
    NoteType duration;
    bool isRest;      // 是否为休止符
    int staff;        // 谱表编号 (1=高音谱, 2=低音谱)
};

struct Measure {
    int number;
    std::vector<Note> notes;
    int beats;        // 拍号分子
    int beatType;     // 拍号分母
};

class MusicXMLParser {
public:
    MusicXMLParser();
    bool parse(const String& xmlContent);
    std::vector<Measure>& getMeasures() { return measures; }
    int getStaffCount() { return staffCount; }
    
private:
    std::vector<Measure> measures;
    int staffCount;
    
    String extractTag(const String& xml, const String& tag, int& pos);
    String extractTagContent(const String& xml, const String& tag, int startPos);
    int findClosingTag(const String& xml, const String& tag, int startPos);
};

#endif

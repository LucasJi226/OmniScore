#include "MusicXMLParser.h"

MusicXMLParser::MusicXMLParser() : staffCount(1) {}

bool MusicXMLParser::parse(const String& xmlContent) {
    measures.clear();
    
    int pos = 0;
    int measureNum = 1;
    
    while (pos < xmlContent.length()) {
        int measureStart = xmlContent.indexOf("<measure", pos);
        if (measureStart == -1) break;
        
        int measureEnd = findClosingTag(xmlContent, "measure", measureStart);
        if (measureEnd == -1) break;
        
        String measureXml = xmlContent.substring(measureStart, measureEnd);
        
        Measure measure;
        measure.number = measureNum++;
        measure.beats = 4;
        measure.beatType = 4;
        
        // 解析拍号
        int timePos = measureXml.indexOf("<time>");
        if (timePos != -1) {
            String beatsStr = extractTagContent(measureXml, "beats", timePos);
            String beatTypeStr = extractTagContent(measureXml, "beat-type", timePos);
            if (beatsStr.length() > 0) measure.beats = beatsStr.toInt();
            if (beatTypeStr.length() > 0) measure.beatType = beatTypeStr.toInt();
        }
        
        // 解析音符
        int notePos = 0;
        while (notePos < measureXml.length()) {
            int noteStart = measureXml.indexOf("<note", notePos);
            if (noteStart == -1) break;
            
            int noteEnd = findClosingTag(measureXml, "note", noteStart);
            if (noteEnd == -1) break;
            
            String noteXml = measureXml.substring(noteStart, noteEnd);
            
            Note note;
            note.isRest = (noteXml.indexOf("<rest") != -1);
            note.alter = 0;
            note.staff = 1;
            note.duration = NOTE_QUARTER;
            
            if (!note.isRest) {
                // 解析音高
                int pitchPos = noteXml.indexOf("<pitch>");
                if (pitchPos != -1) {
                    note.step = extractTagContent(noteXml, "step", pitchPos);
                    String octaveStr = extractTagContent(noteXml, "octave", pitchPos);
                    note.octave = octaveStr.toInt();
                    
                    String alterStr = extractTagContent(noteXml, "alter", pitchPos);
                    if (alterStr.length() > 0) {
                        note.alter = alterStr.toInt();
                    }
                }
            }
            
            // 解析时值
            String typeStr = extractTagContent(noteXml, "type", 0);
            if (typeStr == "whole") note.duration = NOTE_WHOLE;
            else if (typeStr == "half") note.duration = NOTE_HALF;
            else if (typeStr == "quarter") note.duration = NOTE_QUARTER;
            else if (typeStr == "eighth") note.duration = NOTE_EIGHTH;
            else if (typeStr == "16th") note.duration = NOTE_SIXTEENTH;
            
            // 解析谱表
            String staffStr = extractTagContent(noteXml, "staff", 0);
            if (staffStr.length() > 0) {
                note.staff = staffStr.toInt();
            }
            
            measure.notes.push_back(note);
            notePos = noteEnd;
        }
        
        measures.push_back(measure);
        pos = measureEnd;
    }
    
    return measures.size() > 0;
}

String MusicXMLParser::extractTagContent(const String& xml, const String& tag, int startPos) {
    String openTag = "<" + tag + ">";
    String closeTag = "</" + tag + ">";
    
    int start = xml.indexOf(openTag, startPos);
    if (start == -1) return "";
    
    start += openTag.length();
    int end = xml.indexOf(closeTag, start);
    if (end == -1) return "";
    
    return xml.substring(start, end);
}

int MusicXMLParser::findClosingTag(const String& xml, const String& tag, int startPos) {
    String closeTag = "</" + tag + ">";
    int pos = xml.indexOf(closeTag, startPos);
    if (pos == -1) return -1;
    return pos + closeTag.length();
}

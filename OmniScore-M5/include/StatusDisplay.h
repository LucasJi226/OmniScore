#ifndef STATUS_DISPLAY_H
#define STATUS_DISPLAY_H

#include <M5Core2.h>

class StatusDisplay {
public:
    StatusDisplay();
    void showWelcome();
    void showWiFiConfig();
    void showConnecting(const String& ssid);
    void showConnected(const String& ip);
    void showDownloading(const String& url);
    void showDownloadProgress(int percent);
    void showParsing();
    void showReady(int totalPages);
    void showBindingCode(const String& code);
    void showError(const String& message);
    void updateStatus(const String& message, uint16_t color = WHITE);
    
private:
    void clearScreen();
    void drawTitle(const String& title);
    int statusY;
};

#endif

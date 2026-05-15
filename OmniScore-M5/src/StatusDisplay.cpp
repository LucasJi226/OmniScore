#include "StatusDisplay.h"
#include <WiFi.h>

StatusDisplay::StatusDisplay() : statusY(80) {}

void StatusDisplay::clearScreen() {
    M5.Lcd.fillScreen(BLACK);
}

void StatusDisplay::drawTitle(const String& title) {
    M5.Lcd.setTextColor(CYAN, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(10, 10);
    M5.Lcd.println(title);
    M5.Lcd.drawLine(0, 35, 320, 35, CYAN);
}

void StatusDisplay::showWelcome() {
    clearScreen();
    drawTitle("Music Score Viewer");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(40, 100);
    M5.Lcd.println("MusicXML Player");
    
    M5.Lcd.setTextSize(1);
    M5.Lcd.setTextColor(YELLOW, BLACK);
    M5.Lcd.setCursor(60, 140);
    M5.Lcd.println("Initializing...");
    
    // 绘制音符图标
    M5.Lcd.fillCircle(280, 200, 8, WHITE);
    M5.Lcd.fillRect(288, 170, 3, 30, WHITE);
}

void StatusDisplay::showWiFiConfig() {
    clearScreen();
    drawTitle("WiFi Configuration");
    
    M5.Lcd.setTextColor(YELLOW, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 50);
    M5.Lcd.println("No WiFi configured!");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setCursor(10, 75);
    M5.Lcd.println("Please connect to:");
    
    M5.Lcd.setTextColor(GREEN, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(10, 95);
    M5.Lcd.println("M5Stack-Music");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 125);
    M5.Lcd.println("Then open browser to:");
    
    M5.Lcd.setTextColor(CYAN, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(10, 145);
    M5.Lcd.println("192.168.4.1");
    
    M5.Lcd.setTextColor(ORANGE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 180);
    M5.Lcd.println("Configure your WiFi");
    M5.Lcd.setCursor(10, 195);
    M5.Lcd.println("and MusicXML URL");
}

void StatusDisplay::showConnecting(const String& ssid) {
    clearScreen();
    drawTitle("Connecting WiFi");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 60);
    M5.Lcd.println("Connecting to:");
    
    M5.Lcd.setTextColor(CYAN, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(10, 80);
    M5.Lcd.println(ssid);
    
    M5.Lcd.setTextColor(YELLOW, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 120);
    M5.Lcd.print("Please wait");
    
    // 动画点
    for (int i = 0; i < 3; i++) {
        M5.Lcd.print(".");
        delay(200);
    }
}

void StatusDisplay::showConnected(const String& ip) {
    clearScreen();
    drawTitle("WiFi Connected");
    
    M5.Lcd.setTextColor(GREEN, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(80, 70);
    M5.Lcd.println("SUCCESS!");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 110);
    M5.Lcd.println("IP Address:");
    
    M5.Lcd.setTextColor(CYAN, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(10, 130);
    M5.Lcd.println(ip);
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 170);
    M5.Lcd.println("Signal: ");
    int rssi = WiFi.RSSI();
    M5.Lcd.print(rssi);
    M5.Lcd.println(" dBm");
    
    // 信号强度条
    int bars = map(constrain(rssi, -90, -30), -90, -30, 1, 5);
    for (int i = 0; i < 5; i++) {
        uint16_t color = (i < bars) ? GREEN : DARKGREY;
        M5.Lcd.fillRect(150 + i * 15, 170 - i * 5, 10, 10 + i * 5, color);
    }
}

void StatusDisplay::showDownloading(const String& url) {
    clearScreen();
    drawTitle("Downloading Music");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 60);
    M5.Lcd.println("Downloading from:");
    
    M5.Lcd.setTextColor(CYAN, BLACK);
    M5.Lcd.setCursor(10, 80);
    // 截断过长的URL
    if (url.length() > 40) {
        M5.Lcd.println(url.substring(0, 37) + "...");
    } else {
        M5.Lcd.println(url);
    }
    
    M5.Lcd.setTextColor(YELLOW, BLACK);
    M5.Lcd.setCursor(10, 110);
    M5.Lcd.println("Please wait...");
}

void StatusDisplay::showDownloadProgress(int percent) {
    // 绘制进度条
    int barWidth = 280;
    int barHeight = 30;
    int barX = 20;
    int barY = 140;
    
    // 边框
    M5.Lcd.drawRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, WHITE);
    
    // 进度
    int fillWidth = (barWidth * percent) / 100;
    M5.Lcd.fillRect(barX, barY, fillWidth, barHeight, GREEN);
    
    // 百分比文字
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(130, 185);
    M5.Lcd.printf("%3d%%", percent);
}

void StatusDisplay::showParsing() {
    clearScreen();
    drawTitle("Processing Music");
    
    M5.Lcd.setTextColor(YELLOW, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(50, 100);
    M5.Lcd.println("Parsing XML...");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(70, 140);
    M5.Lcd.println("Analyzing notes");
    
    // 旋转动画
    for (int i = 0; i < 8; i++) {
        int angle = i * 45;
        float rad = angle * PI / 180.0;
        int x = 160 + cos(rad) * 30;
        int y = 180 + sin(rad) * 30;
        M5.Lcd.fillCircle(x, y, 3, CYAN);
    }
}

void StatusDisplay::showReady(int totalPages) {
    clearScreen();
    drawTitle("Ready to Play");
    
    M5.Lcd.setTextColor(GREEN, BLACK);
    M5.Lcd.setTextSize(3);
    M5.Lcd.setCursor(80, 80);
    M5.Lcd.println("READY!");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 130);
    M5.Lcd.printf("Total pages: %d", totalPages);
    
    M5.Lcd.setCursor(10, 155);
    M5.Lcd.println("Controls:");
    M5.Lcd.setCursor(10, 170);
    M5.Lcd.println("- Shake device to turn page");
    M5.Lcd.setCursor(10, 185);
    M5.Lcd.println("- Touch screen to navigate");
    
    M5.Lcd.setTextColor(YELLOW, BLACK);
    M5.Lcd.setCursor(60, 210);
    M5.Lcd.println("Starting in 2 seconds...");
}

void StatusDisplay::showBindingCode(const String& code) {
    clearScreen();
    drawTitle("Device Binding");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 50);
    M5.Lcd.println("This device is not bound to an account.");
    
    M5.Lcd.setCursor(10, 75);
    M5.Lcd.println("Go to:");
    M5.Lcd.setTextColor(CYAN, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(10, 95);
    M5.Lcd.println("omniscore.top/devices");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 130);
    M5.Lcd.println("Enter this code:");
    
    M5.Lcd.setTextColor(YELLOW, BLACK);
    M5.Lcd.setTextSize(4);
    M5.Lcd.setCursor(80, 155);
    M5.Lcd.println(code);
    
    M5.Lcd.setTextColor(ORANGE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 210);
    M5.Lcd.println("Waiting for binding...");
}

void StatusDisplay::showError(const String& message) {
    clearScreen();
    drawTitle("Error");
    
    M5.Lcd.setTextColor(RED, BLACK);
    M5.Lcd.setTextSize(2);
    M5.Lcd.setCursor(100, 70);
    M5.Lcd.println("ERROR!");
    
    M5.Lcd.setTextColor(WHITE, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, 110);
    M5.Lcd.println(message);
    
    M5.Lcd.setTextColor(YELLOW, BLACK);
    M5.Lcd.setCursor(10, 200);
    M5.Lcd.println("Please restart device");
}

void StatusDisplay::updateStatus(const String& message, uint16_t color) {
    M5.Lcd.fillRect(0, statusY, 320, 20, BLACK);
    M5.Lcd.setTextColor(color, BLACK);
    M5.Lcd.setTextSize(1);
    M5.Lcd.setCursor(10, statusY);
    M5.Lcd.println(message);
    statusY += 15;
    if (statusY > 220) statusY = 80;
}

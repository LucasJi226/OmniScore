#include <M5Core2.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include "MusicXMLParser.h"
#include "StaffRenderer.h"
#include "GyroPageTurner.h"
#include "StatusDisplay.h"

#include <ArduinoJson.h>

MusicXMLParser parser;
StaffRenderer renderer;
GyroPageTurner pageTurner;
StatusDisplay statusDisplay;
Preferences preferences;
WiFiClientSecure *secureClient = new WiFiClientSecure;

int currentPage = 0;
bool musicLoaded = false;
String musicXmlUrl = "";
String apiBaseUrl = "https://omniscore.art/api"; // Updated API endpoints
String deviceUid = "";

// 获取设备唯一ID (MAC地址)
String getDeviceUID() {
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char uid[13];
    sprintf(uid, "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    return String(uid);
}

// WiFiManager回调函数
void configModeCallback(WiFiManager *myWiFiManager) {
    statusDisplay.showWiFiConfig();
}

void saveConfigCallback() {
    statusDisplay.updateStatus("Config saved!", GREEN);
}

bool downloadAndParseMusicXML(const String& url) {
    // ... (keep existing implementation but update endpoint if needed)
    // Actually, if it's a relative path from our API, we should prepend base
    String fullUrl = url;
    if (url.startsWith("/")) {
        // Remove "/api" if apiBaseUrl ends with it, OR simpler:
        // Because apiBaseUrl is "https://omniscore.art/api" and url is like "/scores/...", 
        // we can just use the host. Let's do:
        fullUrl = "https://omniscore.art/api" + url;
    }
    
    // 显示下载界面
    statusDisplay.showDownloading(fullUrl);
    // ... rest of the function same ...
    delay(500);
    
    HTTPClient http;
    http.begin(*secureClient, fullUrl);
    http.setTimeout(15000); 
    
    statusDisplay.showDownloadProgress(10);
    
    int httpCode = http.GET();
    
    if (httpCode == HTTP_CODE_OK) {
        statusDisplay.showDownloadProgress(50);
        String xmlContent = http.getString();
        http.end();
        statusDisplay.showDownloadProgress(75);
        delay(300);
        statusDisplay.showParsing();
        delay(500);
        if (parser.parse(xmlContent)) {
            renderer.setMeasures(&parser.getMeasures());
            statusDisplay.showDownloadProgress(100);
            delay(300);
            statusDisplay.showReady(renderer.getTotalPages());
            delay(2000);
            return true;
        } else {
            statusDisplay.showError("Failed to parse MusicXML");
            return false;
        }
    } else {
        http.end();
        statusDisplay.showError("HTTP Error: " + String(httpCode));
        return false;
    }
}

// 检查设备绑定状态
bool checkDeviceBinding() {
    HTTPClient http;
    String url = apiBaseUrl + "/devices/status?uid=" + deviceUid;
    
    while (true) {
        http.begin(*secureClient, url);
        int httpCode = http.GET();
        
        if (httpCode == 200) {
            String payload = http.getString();
            StaticJsonDocument<200> doc;
            deserializeJson(doc, payload);
            
            bool bound = doc["bound"];
            if (bound) {
                String userName = doc["user_name"];
                statusDisplay.updateStatus("Bound to: " + userName, GREEN);
                http.end();
                return true;
            } else {
                String bindingCode = doc["binding_code"];
                statusDisplay.showBindingCode(bindingCode);
            }
        } else {
            statusDisplay.updateStatus("Auth error: " + String(httpCode), RED);
        }
        http.end();
        delay(5000); // 每5秒检查一次
    }
}

// 获取用户乐谱列表并选择
String selectScoreFromLibrary() {
    HTTPClient http;
    String url = apiBaseUrl + "/devices/scores?uid=" + deviceUid;
    
    statusDisplay.updateStatus("Fetching library...", CYAN);
    http.begin(*secureClient, url);
    int httpCode = http.GET();
    
    if (httpCode == 200) {
        String payload = http.getString();
        DynamicJsonDocument doc(4096);
        deserializeJson(doc, payload);
        JsonArray scores = doc["scores"];
        
        if (scores.size() == 0) {
            statusDisplay.showError("Library is empty!\nUpload scores on website.");
            http.end();
            delay(5000);
            return "";
        }
        
        // 简单起见，自动选择最新的一个乐谱
        // 实际应用中可以做一个滚动菜单选择
        String scoreId = scores[0]["id"];
        String title = scores[0]["title"];
        statusDisplay.updateStatus("Loading: " + title, GREEN);
        http.end();
        return "/scores/" + scoreId + "/download";
    } else {
        statusDisplay.showError("Failed to fetch library: " + String(httpCode));
        http.end();
        return "";
    }
}

void setup() {
    M5.begin();
    M5.IMU.Init();
    deviceUid = getDeviceUID();
    
    if (secureClient) {
        secureClient->setInsecure();
    }
    
    statusDisplay.showWelcome();
    delay(2000);
    
    // WiFi连接
    WiFiManager wifiManager;
    wifiManager.setAPCallback(configModeCallback);
    wifiManager.setConfigPortalTimeout(180);
    statusDisplay.updateStatus("Starting WiFi...", CYAN);
    
    if (!wifiManager.autoConnect("M5Stack-Music", "music123")) {
        statusDisplay.showError("Failed to connect WiFi");
        delay(3000);
        ESP.restart();
    }
    
    statusDisplay.showConnected(WiFi.localIP().toString());
    delay(2000);
    
    // 1. 检查绑定
    if (checkDeviceBinding()) {
        // 2. 选择乐谱
        while (musicXmlUrl == "") {
            musicXmlUrl = selectScoreFromLibrary();
            if (musicXmlUrl == "") delay(5000);
        }
        
        // 3. 下载并显示
        if (downloadAndParseMusicXML(musicXmlUrl)) {
            musicLoaded = true;
            renderer.renderPage(currentPage);
        } else {
            delay(5000);
            ESP.restart();
        }
    }
}

void loop() {
    M5.update();
    
    if (!musicLoaded) {
        delay(100);
        return;
    }
    
    // 更新陀螺仪数据
    pageTurner.update();
    
    // 检测翻页手势
    bool pageChanged = false;
    
    if (pageTurner.shouldTurnPageForward()) {
        if (currentPage < renderer.getTotalPages() - 1) {
            currentPage++;
            pageChanged = true;
            
            // 显示翻页动画
            M5.Lcd.fillRect(250, 210, 60, 20, GREEN);
            M5.Lcd.setTextColor(BLACK, GREEN);
            M5.Lcd.setTextSize(1);
            M5.Lcd.setCursor(255, 215);
            M5.Lcd.print("Next >>");
            delay(200);
        }
    } else if (pageTurner.shouldTurnPageBackward()) {
        if (currentPage > 0) {
            currentPage--;
            pageChanged = true;
            
            // 显示翻页动画
            M5.Lcd.fillRect(10, 210, 60, 20, BLUE);
            M5.Lcd.setTextColor(WHITE, BLUE);
            M5.Lcd.setTextSize(1);
            M5.Lcd.setCursor(15, 215);
            M5.Lcd.print("<< Prev");
            delay(200);
        }
    }
    
    // 触摸屏翻页（备用方式）
    TouchPoint_t pos = M5.Touch.getPressPoint();
    if (pos.x > 0 && pos.y > 0) {
        if (pos.x > 160) { // 右侧点击
            if (currentPage < renderer.getTotalPages() - 1) {
                currentPage++;
                pageChanged = true;
                
                // 触摸反馈
                M5.Lcd.fillCircle(pos.x, pos.y, 20, GREEN);
                delay(150);
            }
        } else { // 左侧点击
            if (currentPage > 0) {
                currentPage--;
                pageChanged = true;
                
                // 触摸反馈
                M5.Lcd.fillCircle(pos.x, pos.y, 20, BLUE);
                delay(150);
            }
        }
    }
    
    // 重新渲染页面
    if (pageChanged) {
        renderer.renderPage(currentPage);
    }
    
    delay(50);
}

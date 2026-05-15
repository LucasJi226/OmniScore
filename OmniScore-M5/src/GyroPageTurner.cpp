#include "GyroPageTurner.h"

GyroPageTurner::GyroPageTurner() 
    : lastAccelX(0), 
      shakeThreshold(1.5), 
      lastShakeTime(0), 
      shakeDebounceMs(800),
      shakeDetected(false),
      shakeDirection(0) {}

void GyroPageTurner::update() {
    float accX, accY, accZ;
    M5.IMU.getAccelData(&accX, &accY, &accZ);
    
    unsigned long currentTime = millis();
    
    // 检测X轴加速度的突变（晃动）
    float accelChange = accX - lastAccelX;
    
    if (abs(accelChange) > shakeThreshold && 
        (currentTime - lastShakeTime) > shakeDebounceMs) {
        
        shakeDetected = true;
        shakeDirection = accelChange;
        lastShakeTime = currentTime;
    }
    
    lastAccelX = accX;
}

bool GyroPageTurner::shouldTurnPageForward() {
    if (shakeDetected && shakeDirection > 0) {
        shakeDetected = false;
        return true;
    }
    return false;
}

bool GyroPageTurner::shouldTurnPageBackward() {
    if (shakeDetected && shakeDirection < 0) {
        shakeDetected = false;
        return true;
    }
    return false;
}

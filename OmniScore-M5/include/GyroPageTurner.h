#ifndef GYRO_PAGE_TURNER_H
#define GYRO_PAGE_TURNER_H

#include <M5Core2.h>

class GyroPageTurner {
public:
    GyroPageTurner();
    void update();
    bool shouldTurnPageForward();
    bool shouldTurnPageBackward();
    
private:
    float lastAccelX;
    float shakeThreshold;
    unsigned long lastShakeTime;
    unsigned long shakeDebounceMs;
    bool shakeDetected;
    float shakeDirection;
};

#endif

# M5Stack Core2 MusicXML五线谱显示器

这是一个运行在M5Stack Core2上的MusicXML五线谱显示程序，支持通过HTTP下载乐谱文件，并通过陀螺仪晃动实现翻页功能。

## 功能特性

1. **账户同步**: 通过 OmniScore 网站绑定账户，自动同步个人乐谱库
2. **五线谱渲染**: 在 M5Stack Core2 屏幕上显示五线谱、音符、谱号、拍号等
3. **陀螺仪翻页**: 通过晃动设备实现前后翻页
4. **无需配置 API**: 绑定后由服务端自动管理下载地址

## 硬件要求

- M5Stack Core2
- WiFi网络连接

## 软件依赖

- PlatformIO
- M5Core2库 (v0.1.9+)
- ArduinoJson库 (v6.21.3+)
- WiFiManager库 (v2.0.16-rc.2+)

## 安装步骤

1. 安装PlatformIO IDE或VSCode + PlatformIO扩展
2. 克隆或下载此项目
3. 连接M5Stack Core2到电脑
4. 编译并上传：
   ```bash
   pio run --target upload
   ```

## 首次配置与绑定

1. **连接 WiFi**:
   - 如果没有 WiFi 配置，设备会创建 `M5Stack-Music` 热点。
   - 访问 `192.168.4.1` 配置 WiFi（不再需要手动输入 MusicXML URL）。
2. **获取绑定码**:
   - WiFi 连接成功后，屏幕会显示 "Device Binding" 界面。
   - 记住屏幕上显示的 6 位数字 **Binding Code**。
3. **网站绑定**:
   - 登录 [OmniScore 网站](https://omniscore.top)。
   - 进入 "我的设备" 页面。
   - 输入屏幕上的绑定码并点击 "立即绑定"。
4. **自动同步**:
   - 绑定成功后，设备会自动重启并进入你的乐谱库。
   - 默认会自动加载库中最新上传的乐谱。

## 使用说明

### 首次启动
1. 设备显示欢迎界面
2. 自动进入WiFi配置模式（如果未配置）
3. 屏幕显示配置热点信息
4. 连接热点并配置WiFi和MusicXML URL
5. 配置完成后自动下载乐谱

### 状态显示
程序会在屏幕上实时显示当前操作状态：
- **欢迎界面**：启动时显示
- **WiFi配置界面**：显示热点名称和配置地址
- **连接中**：显示正在连接的WiFi名称
- **已连接**：显示IP地址和信号强度
- **下载中**：显示下载URL和进度条
- **解析中**：显示XML解析状态
- **准备就绪**：显示总页数和操作提示
- **错误提示**：显示错误信息

### 翻页操作

**方式1：陀螺仪晃动**
- 向右晃动设备：下一页（屏幕右下角显示绿色"Next >>"）
- 向左晃动设备：上一页（屏幕左下角显示蓝色"<< Prev"）
- 晃动幅度需要足够大才能触发（防止误触发）

**方式2：触摸屏**
- 点击屏幕右侧：下一页（显示绿色圆圈反馈）
- 点击屏幕左侧：上一页（显示蓝色圆圈反馈）

### 重新配置
如需更改WiFi或MusicXML URL：
1. 长按设备电源键重启
2. 在启动时快速点击屏幕3次（可选功能）
3. 或通过串口发送重置命令

## 项目结构

```
├── include/
│   ├── MusicXMLParser.h      # MusicXML解析器头文件
│   ├── StaffRenderer.h        # 五线谱渲染器头文件
│   ├── GyroPageTurner.h       # 陀螺仪翻页控制器头文件
│   └── StatusDisplay.h        # 状态显示模块头文件
├── src/
│   ├── MusicXMLParser.cpp     # MusicXML解析实现
│   ├── StaffRenderer.cpp      # 五线谱渲染实现
│   ├── GyroPageTurner.cpp     # 陀螺仪翻页实现
│   ├── StatusDisplay.cpp      # 状态显示实现
│   └── main.cpp               # 主程序
├── platformio.ini             # PlatformIO配置
└── README.md                  # 说明文档
```

## 核心模块说明

### StatusDisplay
负责在屏幕上显示各种状态信息和用户反馈。

功能：
- 欢迎界面
- WiFi配置提示界面
- 连接状态显示（含信号强度）
- 下载进度条
- 解析状态动画
- 错误提示
- 翻页视觉反馈

### MusicXMLParser
负责解析MusicXML格式文件，提取小节、音符、拍号等信息。

支持的元素：
- 音符（note）：音高、时值、升降号
- 休止符（rest）
- 小节（measure）
- 拍号（time signature）

### StaffRenderer
负责在屏幕上绘制五线谱和音符。

功能：
- 绘制五线谱线
- 绘制谱号（高音谱号/低音谱号）
- 绘制音符（符头、符干、加线）
- 绘制升降号
- 绘制拍号
- 分页显示

### GyroPageTurner
使用M5Stack Core2的IMU传感器检测设备晃动，实现翻页控制。

参数：
- `shakeThreshold`: 晃动阈值（默认1.5）
- `shakeDebounceMs`: 防抖时间（默认800ms）

## MusicXML格式示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

## 调试

使用串口监视器查看调试信息：
```bash
pio device monitor
```

波特率：115200

## 注意事项

1. 首次使用需要配置WiFi和MusicXML URL
2. MusicXML文件需要托管在可访问的HTTP服务器上（支持HTTPS）
3. 配置信息会保存在设备中，重启后自动连接
4. WiFi配置超时时间为3分钟，超时后设备会重启
5. 陀螺仪灵敏度可以通过修改`GyroPageTurner`中的`shakeThreshold`调整
6. 屏幕分辨率有限，每页显示4个小节，复杂乐谱可能显示效果有限
7. 当前实现为简化版本，复杂的MusicXML特性（如连音线、装饰音等）暂不支持
8. 所有状态变化都会在屏幕上实时显示，方便调试和使用

## 扩展建议

1. 添加更多MusicXML元素支持（连音线、装饰音、力度记号等）
2. 优化五线谱渲染算法，支持更复杂的布局
3. 添加音频播放功能
4. 支持本地文件系统存储乐谱
5. 添加乐谱库管理界面
6. 支持双谱表（钢琴谱）显示

## 许可证

MIT License

@echo off
powershell -Command "$lines = Get-Content 'src/components/VideoFeedPanel.tsx'; $lines[0..861] | Set-Content 'src/components/VideoFeedPanel.tsx.new' -Encoding UTF8; $lines[1176..($lines.Count-1)] | Add-Content 'src/components/VideoFeedPanel.tsx.new' -Encoding UTF8"
move /Y src\components\VideoFeedPanel.tsx.new src\components\VideoFeedPanel.tsx
type src\components\VideoFeedPanel.tsx | findstr "return ("

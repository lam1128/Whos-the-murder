# 大侦探

## 项目用途

中文互动剧情游戏网页项目。项目通过统一网页运行多个剧情 Scenario，支持角色创建、场景选择、选项交互和本地存档。

## 安装与运行

需要安装 Git 和 Node.js。

首次使用时克隆项目并安装依赖：

```powershell
git clone git@github.com:lam1128/Whos-the-murder.git
cd Whos-the-murder
npm install
```

启动项目：

```powershell
npm run dev
```

浏览器打开：<http://localhost:3000>

## 更新项目

开始修改前先获取最新版本：

```powershell
git pull --rebase
```

修改完成后提交并上传：

```powershell
git add -A
git commit -m "更新项目"
git push
```

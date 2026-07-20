# 职评网 - 找工作避雷指南

一个帮助求职者分享工作经验、避雷坑爹公司的社区网站。

## 功能模块

### 👍 好工作推荐
用户分享优质公司和岗位，推荐值得加入的团队。

### 👌 中等工作
客观描述一般般的工作，优缺点并存，供求职者自行判断。

### ⚠️ 避雷工作
踩坑经验分享，帮助大家避开坑爹公司和岗位。

### 管理员功能
- 内容管理：删除违规信息
- 评论管理：管理用户评论
- 用户管理：管理注册用户
- COS配置：配置腾讯云对象存储
- 站点设置：更换背景图片、主题色

## 技术栈

- **前端框架**: Vue 3 + Vite
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **存储**: 腾讯云对象存储 (COS)
- **部署**: GitHub Pages

## 快速开始

### 1. 安装依赖

`ash
npm install
`

### 2. 本地开发

`ash
npm run dev
`

### 3. 配置腾讯云COS

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com)
2. 创建一个存储桶（推荐私有读写）
3. 在 COS 控制台获取 Bucket 名称和所属地域
4. 在访问管理获取 SecretId 和 SecretKey
5. 部署后，在网站管理后台的「COS配置」中填入以上信息
6. 首次使用需要手动在存储桶中创建 data/ 和 config/ 目录

### 4. 构建部署

`ash
npm run build
`

### 5. 部署到GitHub Pages

`ash
npm run deploy
`

或者配置 GitHub Actions 自动部署（参见 .github/workflows/deploy.yml）。

## 项目结构

`
D:\\评论网站\\
├── index.html              # 入口HTML
├── package.json            # 依赖配置
├── vite.config.js          # Vite配置
├── .github/workflows/      # GitHub Actions
├── src/
│   ├── main.js             # 应用入口
│   ├── App.vue             # 根组件
│   ├── router/index.js     # 路由配置
│   ├── stores/app.js       # 状态管理
│   ├── utils/
│   │   ├── cos.js          # 腾讯云COS SDK工具
│   │   └── auth.js         # 用户认证工具
│   ├── components/
│   │   ├── NavBar.vue      # 导航栏
│   │   ├── JobCard.vue     # 工作卡片
│   │   └── CommentSection.vue  # 评论区
│   ├── views/
│   │   ├── Home.vue        # 首页
│   │   ├── GoodJobs.vue    # 好工作
│   │   ├── MediumJobs.vue  # 中等工作
│   │   ├── BadJobs.vue     # 避雷工作
│   │   ├── JobDetail.vue   # 详情页
│   │   ├── Login.vue       # 登录
│   │   ├── Register.vue    # 注册
│   │   └── Admin.vue       # 管理后台
│   └── assets/styles.css   # 全局样式
`

## 数据存储结构 (腾讯云COS)

`
your-bucket/
├── data/
│   ├── users.json          # 用户数据
│   ├── good-jobs.json      # 好工作数据
│   ├── medium-jobs.json    # 中等工作数据
│   ├── bad-jobs.json       # 避雷工作数据
│   └── comments.json       # 评论数据
└── config/
    └── site-config.json    # 站点配置
`

## 默认管理员

- 用户名: admin
- 密码: admin123

## 许可证

MIT

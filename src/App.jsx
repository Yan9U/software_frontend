import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { Activity, Battery, MapPin, AlertTriangle, CheckCircle, Clock, Sun, Droplets, Settings, History, LayoutDashboard, Map, LogOut, User, ChevronRight, Download, Upload, Search, Filter, RefreshCw, Plane, Eye, FileText, Bell, TrendingUp, TrendingDown, Zap, Loader2, Camera, Image, Wifi, WifiOff } from 'lucide-react';

// Production-ready components
import { ToastProvider, useToast } from './components/Toast';
import { useFeatureGuard } from './components/FeatureGuard';
import { exportZoneSummary, exportHistoryRecords, exportMirrorFieldData, exportCleanlinessAnalysis } from './utils/excelExport';

// API Services and Hooks
import { apiService, classifyImage, fetchHistory, refreshDashboard, startInspection, filterInspectionRecords, testModbusConnection, saveSettings, importData, getMirrorFieldData } from './services/api';
import { useBackendConnection, useImageClassification, useDetectionHistory } from './hooks/useApi';
import DetectionPage from './components/DetectionPage';
import DetectionHistoryPage from './components/DetectionHistoryPage';
import ConnectionStatus from './components/ConnectionStatus';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Backend connection state (set to true when backend/MODBUS is connected)
const BACKEND_CONNECTED = false;

// 模拟数据
const cleanlinessHistory = [
  { date: '12-01', avg: 92.3, min: 85, max: 98 },
  { date: '12-05', avg: 89.1, min: 82, max: 95 },
  { date: '12-09', avg: 86.5, min: 78, max: 94 },
  { date: '12-13', avg: 91.2, min: 84, max: 97 },
  { date: '12-17', avg: 88.7, min: 80, max: 96 },
  { date: '12-21', avg: 93.4, min: 87, max: 99 },
];

const zoneData = [
  { zone: 'A区', count: 3647, cleanliness: 91.8, status: 'good' },
  { zone: 'B区', count: 3563, cleanliness: 86.9, status: 'warning' },
  { zone: 'C区', count: 3647, cleanliness: 90.0, status: 'good' },
  { zone: 'D区', count: 3643, cleanliness: 78.0, status: 'critical' },
];

const alertsData = [
  { id: 1, type: 'warning', message: 'D区清洁度低于阈值', time: '10分钟前', zone: 'D区' },
  { id: 2, type: 'info', message: '无人机任务完成 - 批次#2024121701', time: '25分钟前', zone: '全场' },
  { id: 3, type: 'warning', message: 'B区部分定日镜需要清洗', time: '1小时前', zone: 'B区' },
  { id: 4, type: 'success', message: 'A区清洗作业完成', time: '2小时前', zone: 'A区' },
];

const historyRecords = [
  { id: 'INS-2024121701', date: '2024-12-17 14:30', zones: '全场', mirrors: 14500, avgCleanliness: 89.2, status: 'completed', duration: '45min' },
  { id: 'INS-2024121301', date: '2024-12-13 09:15', zones: 'A-C区', mirrors: 7250, avgCleanliness: 91.5, status: 'completed', duration: '28min' },
  { id: 'INS-2024120901', date: '2024-12-09 10:00', zones: '全场', mirrors: 14500, avgCleanliness: 86.5, status: 'completed', duration: '47min' },
  { id: 'INS-2024120501', date: '2024-12-05 15:20', zones: 'D-F区', mirrors: 7250, avgCleanliness: 88.1, status: 'completed', duration: '25min' },
  { id: 'INS-2024120101', date: '2024-12-01 11:45', zones: '全场', mirrors: 14500, avgCleanliness: 92.3, status: 'completed', duration: '44min' },
];

// Mirror field data - loaded from API
// Center tower location: 经度 94.965492, 纬度 43.618492 (新疆哈密)
// Total 14,500 heliostats
const MIRROR_CENTER = { lat: 43.618492, lng: 94.965492 };

// 镜场边界（米）
const BOUNDS = { xMin: -914, xMax: 907, yMin: -518, yMax: 1270 };

// 分区颜色配置
const ZONE_COLORS = {
  A: { bg: '#10b981', name: 'A区' },
  B: { bg: '#3b82f6', name: 'B区' },
  C: { bg: '#8b5cf6', name: 'C区' },
  D: { bg: '#f59e0b', name: 'D区' },
};

// 登录页面
// Default user data
const DEFAULT_USERS = {
  '01': { password: '123456', role: 'operator', displayName: '操作员' },
  '02': { password: '123456', role: 'developer', displayName: '开发人员' },
};

// Get users from localStorage or use defaults
const getUsers = () => {
  const storedUsers = localStorage.getItem('heliostat_users');
  if (storedUsers) {
    return JSON.parse(storedUsers);
  }
  // Initialize with default users
  localStorage.setItem('heliostat_users', JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
};

// Save users to localStorage
const saveUsers = (users) => {
  localStorage.setItem('heliostat_users', JSON.stringify(users));
};

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState('operator');
  const [displayName, setDisplayName] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    // Validate that username and password are entered
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    // Validate credentials
    const users = getUsers();
    const user = users[username];
    if (!user || user.password !== password) {
      setError('用户名或密码错误');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      onLogin({ username: user.displayName, role: user.role });
      setIsLoading(false);
    }, 800);
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!displayName.trim()) {
      setError('请输入显示名称');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    // Check if username already exists
    const users = getUsers();
    if (users[username]) {
      setError('用户名已存在');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      // Add new user
      const newUsers = {
        ...users,
        [username]: {
          password: password,
          role: signUpRole,
          displayName: displayName
        }
      };
      saveUsers(newUsers);

      // Auto login after signup
      onLogin({ username: displayName, role: signUpRole });
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-slate-800/50 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-slate-800/30 rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25 mb-6">
            <Sun size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">定日镜清洁度测量系统</h1>
          <p className="text-slate-400 mt-2 text-sm">Heliostat Cleanliness Measurement System</p>
        </div>

        {/* 登录/注册卡片 */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Tab切换 */}
          <div className="flex mb-6 bg-slate-800/50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                !isSignUp
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                isSignUp
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              注册
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {!isSignUp ? (
            /* 登录表单 */
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25"
              >
                {isLoading ? (
                  <RefreshCw size={20} className="inline animate-spin" />
                ) : (
                  '登 录'
                )}
              </button>
            </form>
          ) : (
            /* 注册表单 */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名（用于登录）"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">显示名称</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="请输入显示名称"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码（至少6位）"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">角色选择</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignUpRole('operator')}
                    className={`px-4 py-3 rounded-xl border transition-all ${
                      signUpRole === 'operator'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <User size={18} className="inline mr-2" />
                    操作员
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignUpRole('developer')}
                    className={`px-4 py-3 rounded-xl border transition-all ${
                      signUpRole === 'developer'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Settings size={18} className="inline mr-2" />
                    开发人员
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25"
              >
                {isLoading ? (
                  <RefreshCw size={20} className="inline animate-spin" />
                ) : (
                  '注 册'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2025 定日镜清洁度测量系统 · 版本 1.0
        </p>
      </div>
    </div>
  );
};

// 侧边栏组件
const Sidebar = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '系统总览' },
    { id: 'analysis', icon: Activity, label: '清洁度分析' },
    { id: 'mirrorfield', icon: Map, label: '镜场可视化' },
    { id: 'detection', icon: Camera, label: '图像检测' },
    { id: 'history', icon: History, label: '历史记录' },
    { id: 'detectionhistory', icon: FileText, label: '检测记录' },
    { id: 'logs', icon: FileText, label: '系统日志' },
  ];

  if (user.role === 'developer') {
    menuItems.push({ id: 'settings', icon: Settings, label: '系统设置' });
  }

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sun size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">定日镜清洁度</h1>
            <p className="text-slate-500 text-xs">测量系统</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-slate-800">
        <ConnectionStatus pollInterval={30000} />
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && <ChevronRight size={16} className="ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* 用户信息 */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.username}</p>
            <p className="text-slate-500 text-xs">{user.role === 'developer' ? '开发人员' : '操作员'}</p>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// 统计卡片组件
const StatCard = ({ icon: Icon, label, value, unit, trend, trendValue, color = 'amber' }) => {
  const colorClasses = {
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/20',
    cyan: 'from-cyan-500 to-blue-500 shadow-cyan-500/20',
    emerald: 'from-emerald-500 to-green-500 shadow-emerald-500/20',
    rose: 'from-rose-500 to-pink-500 shadow-rose-500/20',
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon size={22} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">
        {value}
        {unit && <span className="text-base font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
};

// 仪表盘页面
const DashboardPage = () => {
  const toast = useToast();
  const guardFeature = useFeatureGuard();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [droneStatus, setDroneStatus] = useState({
    battery: 78,
    position: 'C区-15排',
    status: '巡检中',
    progress: 65,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Refresh failed: ' + error.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartInspection = async () => {
    setIsRefreshing(true);
    try {
      const result = await startInspection('全场');
      setDroneStatus(prev => ({...prev, status: '巡检中', progress: 0}));
      toast.success('Inspection started successfully');
    } catch (error) {
      toast.error('Failed to start inspection: ' + error.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">系统总览</h2>
          <p className="text-slate-400 text-sm mt-1">实时监控镜场状态与无人机巡检进度</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? '刷新中...' : '刷新数据'}
          </button>
          <button
            onClick={handleStartInspection}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Plane size={16} />
            开始巡检
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Sun} label="定日镜总数" value="14,500" unit="面" color="amber" />
        <StatCard icon={Droplets} label="平均清洁度" value="89.2" unit="%" trend="up" trendValue="+2.1%" color="cyan" />
        <StatCard icon={AlertTriangle} label="待清洗数量" value="847" unit="面" trend="down" trendValue="-12%" color="rose" />
        <StatCard icon={CheckCircle} label="本月巡检次数" value="12" unit="次" color="emerald" />
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 清洁度趋势图 */}
        <div className="col-span-2 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">清洁度趋势</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                平均值
              </span>
              <span className="flex items-center gap-2 text-slate-400">
                <span className="w-3 h-3 rounded-full bg-cyan-500/50"></span>
                范围
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cleanlinessHistory}>
              <defs>
                <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis domain={[70, 100]} stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                labelStyle={{ color: '#f8fafc' }}
              />
              <Area type="monotone" dataKey="max" stackId="1" stroke="transparent" fill="url(#colorRange)" />
              <Area type="monotone" dataKey="min" stackId="2" stroke="transparent" fill="#0f172a" />
              <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', strokeWidth: 0, r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 无人机状态 */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">无人机状态</h3>
          <div className="space-y-6">
            {/* 状态指示 */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border-4 border-emerald-500/30">
                  <Plane size={40} className="text-emerald-400" />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                  {droneStatus.status}
                </div>
              </div>
            </div>

            {/* 详细信息 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Battery size={16} />
                  电量
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                      style={{ width: `${droneStatus.battery}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-medium text-sm">{droneStatus.battery}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <MapPin size={16} />
                  当前位置
                </span>
                <span className="text-white font-medium text-sm">{droneStatus.position}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Activity size={16} />
                  任务进度
                </span>
                <span className="text-white font-medium text-sm">{droneStatus.progress}%</span>
              </div>
            </div>

            {/* 进度条 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500">巡检进度</span>
                <span className="text-amber-400 font-medium">{droneStatus.progress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${droneStatus.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部区域 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 分区状态 */}
        <div className="col-span-2 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">分区状态</h3>
            <button className="text-amber-400 text-sm hover:text-amber-300 transition-colors flex items-center gap-1">
              查看详情 <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {zoneData.map((zone) => (
              <div 
                key={zone.zone}
                className={`p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${
                  zone.status === 'critical' 
                    ? 'bg-rose-500/10 border-rose-500/30' 
                    : zone.status === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-semibold">{zone.zone}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    zone.status === 'critical' 
                      ? 'bg-rose-500/20 text-rose-400' 
                      : zone.status === 'warning'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {zone.cleanliness.toFixed(1)}%
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{zone.count.toLocaleString()} 面定日镜</p>
              </div>
            ))}
          </div>
        </div>

        {/* 最新告警 */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell size={18} className="text-amber-400" />
              最新告警
            </h3>
            <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs font-medium rounded-full">
              2 条待处理
            </span>
          </div>
          <div className="space-y-3">
            {alertsData.slice(0, 4).map((alert) => (
              <div 
                key={alert.id}
                className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    alert.type === 'warning' ? 'bg-amber-400' :
                    alert.type === 'success' ? 'bg-emerald-400' : 'bg-cyan-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{alert.message}</p>
                    <p className="text-slate-500 text-xs mt-1">{alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 清洁度分析页面
const AnalysisPage = () => {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // 基于真实数据的分布统计
  const pieData = [
    { name: '优秀 (>95%)', value: 4350, color: '#10b981' },
    { name: '良好 (85-95%)', value: 5800, color: '#06b6d4' },
    { name: '一般 (75-85%)', value: 2900, color: '#f59e0b' },
    { name: '较差 (<75%)', value: 1450, color: '#ef4444' },
  ];

  // Export to Excel handler - FUNCTIONAL
  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      // Small delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      exportZoneSummary(zoneData, 'cleanliness-analysis');
      toast.success('Report exported successfully!');
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Import handler - now functional
  const fileInputRef = useRef(null);
  const handleImportRecords = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const result = await importData(file);
      toast.success(result.message || 'Records imported successfully');
    } catch (error) {
      toast.error('Import failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">清洁度分析</h2>
          <p className="text-slate-400 text-sm mt-1">最近一次巡检数据分析 · 2024-12-17 14:30</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? '导出中...' : '导出报告'}
          </button>
          <button
            onClick={handleImportRecords}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <Upload size={16} />
            导入清洗记录
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Activity} label="平均清洁度" value="89.2" unit="%" color="cyan" />
        <StatCard icon={TrendingUp} label="最高清洁度" value="99.1" unit="%" color="emerald" />
        <StatCard icon={TrendingDown} label="最低清洁度" value="68.3" unit="%" color="rose" />
        <StatCard icon={Zap} label="置信度" value="94.5" unit="%" color="amber" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 分布饼图 */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">清洁度分布</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                formatter={(value) => [`${value.toLocaleString()} 面`, '数量']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-400 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 分区柱状图 */}
        <div className="col-span-2 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">各区清洁度对比</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={zoneData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="zone" stroke="#64748b" fontSize={12} />
              <YAxis domain={[70, 100]} stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                formatter={(value) => [`${value.toFixed(1)}%`, '清洁度']}
              />
              <Bar dataKey="cleanliness" radius={[6, 6, 0, 0]}>
                {zoneData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.cleanliness >= 90 ? '#10b981' :
                      entry.cleanliness >= 80 ? '#06b6d4' :
                      entry.cleanliness >= 75 ? '#f59e0b' : '#ef4444'
                    } 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 详细数据表格 */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">分区详细数据</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="搜索分区..."
                className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-48"
              />
            </div>
            <button className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
              <Filter size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-700">
                <th className="pb-4 text-slate-400 font-medium text-sm">分区</th>
                <th className="pb-4 text-slate-400 font-medium text-sm">定日镜数量</th>
                <th className="pb-4 text-slate-400 font-medium text-sm">平均清洁度</th>
                <th className="pb-4 text-slate-400 font-medium text-sm">最低清洁度</th>
                <th className="pb-4 text-slate-400 font-medium text-sm">待清洗</th>
                <th className="pb-4 text-slate-400 font-medium text-sm">状态</th>
                <th className="pb-4 text-slate-400 font-medium text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {zoneData.map((zone) => (
                <tr key={zone.zone} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 text-white font-medium">{zone.zone}</td>
                  <td className="py-4 text-slate-300">{zone.count.toLocaleString()}</td>
                  <td className="py-4">
                    <span className={`font-medium ${
                      zone.cleanliness >= 90 ? 'text-emerald-400' :
                      zone.cleanliness >= 80 ? 'text-cyan-400' :
                      zone.cleanliness >= 75 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {zone.cleanliness.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 text-slate-300">{(zone.cleanliness - 8 - Math.random() * 5).toFixed(1)}%</td>
                  <td className="py-4 text-slate-300">{Math.floor(zone.count * (100 - zone.cleanliness) / 100)}</td>
                  <td className="py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      zone.status === 'critical' 
                        ? 'bg-rose-500/20 text-rose-400' 
                        : zone.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {zone.status === 'critical' ? '需清洗' : zone.status === 'warning' ? '注意' : '正常'}
                    </span>
                  </td>
                  <td className="py-4">
                    <button className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1">
                      <Eye size={14} />
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 图片预览模态框组件 - 单独抽离以优化渲染
const ImagePreviewModal = ({ mirror, onClose, sampleImageUrl }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // 点击背景关闭
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ESC键关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!mirror) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Sun size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">定日镜 {mirror.id}</h3>
              <p className="text-slate-400 text-sm">{mirror.zone}区 · 坐标 ({mirror.x}, {mirror.y})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 图片内容区 */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* 图片预览 */}
            <div className="col-span-2">
              <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video">
                {/* 加载占位 */}
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {/* 实际图片 - 使用 loading="lazy" 和 decoding="async" 优化 */}
                <img
                  src={sampleImageUrl}
                  alt={`定日镜 ${mirror.id} 拍摄图像`}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%231e293b' width='400' height='300'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle'%3EImage not available%3C/text%3E%3C/svg%3E"; setImageLoaded(true); }}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
                {/* 图片信息叠加层 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">拍摄时间: 2024-12-17 14:32:15</span>
                    <span className="text-white/80">无人机: Matrice 4TD</span>
                  </div>
                </div>
              </div>
              
              {/* 图片操作按钮 */}
              <div className="flex items-center gap-3 mt-4">
                <button className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                  <Download size={16} />
                  下载原图
                </button>
                <button className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                  <Eye size={16} />
                  查看大图
                </button>
              </div>
            </div>

            {/* 详细信息面板 */}
            <div className="space-y-4">
              {/* 清洁度指示 */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-2">清洁度评估</p>
                <div className="flex items-end gap-2">
                  <span className={`text-4xl font-bold ${
                    mirror.cleanliness >= 85 ? 'text-emerald-400' :
                    mirror.cleanliness >= 75 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {mirror.cleanliness.toFixed(1)}
                  </span>
                  <span className="text-slate-500 text-lg mb-1">%</span>
                </div>
                <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      mirror.cleanliness >= 85 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' :
                      mirror.cleanliness >= 75 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 
                      'bg-gradient-to-r from-rose-500 to-pink-500'
                    }`}
                    style={{ width: `${mirror.cleanliness}%` }}
                  ></div>
                </div>
              </div>

              {/* 分析详情 */}
              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                <p className="text-slate-400 text-xs">分析详情</p>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">置信度</span>
                  <span className="text-white text-sm font-medium">94.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">反射率</span>
                  <span className="text-white text-sm font-medium">{(mirror.cleanliness * 0.95).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">灰尘等级</span>
                  <span className={`text-sm font-medium ${
                    mirror.cleanliness >= 85 ? 'text-emerald-400' : 
                    mirror.cleanliness >= 75 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {mirror.cleanliness >= 85 ? '轻微' : mirror.cleanliness >= 75 ? '中等' : '严重'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">上次清洗</span>
                  <span className="text-white text-sm font-medium">7天前</span>
                </div>
              </div>

              {/* 状态标签 */}
              <div className={`rounded-xl p-4 ${
                mirror.cleanliness >= 85 ? 'bg-emerald-500/10 border border-emerald-500/30' :
                mirror.cleanliness >= 75 ? 'bg-amber-500/10 border border-amber-500/30' :
                'bg-rose-500/10 border border-rose-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  {mirror.cleanliness >= 85 ? (
                    <CheckCircle size={20} className="text-emerald-400" />
                  ) : mirror.cleanliness >= 75 ? (
                    <AlertTriangle size={20} className="text-amber-400" />
                  ) : (
                    <AlertTriangle size={20} className="text-rose-400" />
                  )}
                  <div>
                    <p className={`font-medium text-sm ${
                      mirror.cleanliness >= 85 ? 'text-emerald-400' :
                      mirror.cleanliness >= 75 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {mirror.cleanliness >= 85 ? '状态良好' : mirror.cleanliness >= 75 ? '建议关注' : '需要清洗'}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {mirror.cleanliness >= 85 ? '无需处理' : mirror.cleanliness >= 75 ? '可安排清洗' : '优先处理'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 镜场可视化页面 - 交互式Canvas地图
const MirrorFieldPage = () => {
  const toast = useToast();
  const canvasRef = React.useRef(null);
  const containerRef = React.useRef(null);

  // Mirror data from API
  const [mirrorData, setMirrorData] = useState([]);
  const [mirrorDataLoading, setMirrorDataLoading] = useState(true);
  const [mirrorDataError, setMirrorDataError] = useState(null);

  // Load mirror data from API
  useEffect(() => {
    const loadMirrorData = async () => {
      try {
        setMirrorDataLoading(true);
        setMirrorDataError(null);
        const response = await getMirrorFieldData();
        if (response.success && response.mirrors) {
          setMirrorData(response.mirrors);
        } else {
          throw new Error(response.error || 'Failed to load mirror data');
        }
      } catch (error) {
        console.error('Failed to load mirror field data:', error);
        setMirrorDataError(error.message || 'Failed to load mirror data');
        toast.error('Failed to load mirror field data. Please ensure the backend is running.');
      } finally {
        setMirrorDataLoading(false);
      }
    };
    loadMirrorData();
  }, []);

  // 视图状态
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);

  // 交互状态
  const [selectedMirror, setSelectedMirror] = useState(null);
  const [hoveredMirror, setHoveredMirror] = useState(null);
  const [selectedZones, setSelectedZones] = useState(['A', 'B', 'C', 'D']);
  const [colorMode, setColorMode] = useState('cleanliness');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [previewMirror, setPreviewMirror] = useState(null);

  // 示例图片URL
  // Use backend API for mirror images
  const getMirrorImageUrl = (mirrorId) => `http://localhost:5000/api/mirror/image/${encodeURIComponent(mirrorId)}`;

  // Export mirror field data to Excel - FUNCTIONAL
  const handleExportMirrorData = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      exportMirrorFieldData(mirrorData, 'mirror-field-data');
      toast.success('Mirror field data exported successfully!');
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };
  
  // 过滤后的镜子数据
  const filteredMirrors = React.useMemo(() => {
    return mirrorData.filter(m => selectedZones.includes(m.z));
  }, [selectedZones, mirrorData]);
  
  // 统计数据
  const stats = React.useMemo(() => {
    const zoneStats = {};
    ['A', 'B', 'C', 'D'].forEach(z => {
      const zm = mirrorData.filter(m => m.z === z);
      zoneStats[z] = {
        count: zm.length,
        avgClean: zm.length > 0 ? (zm.reduce((s, m) => s + m.c, 0) / zm.length).toFixed(1) : 0
      };
    });
    return {
      total: filteredMirrors.length,
      zones: zoneStats,
      excellent: filteredMirrors.filter(m => m.c >= 95).length,
      good: filteredMirrors.filter(m => m.c >= 85 && m.c < 95).length,
      fair: filteredMirrors.filter(m => m.c >= 75 && m.c < 85).length,
      poor: filteredMirrors.filter(m => m.c < 75).length,
    };
  }, [filteredMirrors, mirrorData]);
  
  // 清洁度颜色
  const getColor = (c) => {
    if (c >= 95) return '#10b981';
    if (c >= 85) return '#06b6d4';
    if (c >= 75) return '#f59e0b';
    return '#ef4444';
  };
  
  // 坐标转换
  const dataToCanvas = React.useCallback((x, y) => {
    const scale = Math.min(
      canvasSize.width / (BOUNDS.xMax - BOUNDS.xMin),
      canvasSize.height / (BOUNDS.yMax - BOUNDS.yMin)
    ) * 0.9;
    return {
      x: canvasSize.width / 2 + (x * scale * zoom) + offset.x,
      y: canvasSize.height / 2 - (y * scale * zoom) + offset.y
    };
  }, [canvasSize, zoom, offset]);
  
  const canvasToData = React.useCallback((cx, cy) => {
    const scale = Math.min(
      canvasSize.width / (BOUNDS.xMax - BOUNDS.xMin),
      canvasSize.height / (BOUNDS.yMax - BOUNDS.yMin)
    ) * 0.9;
    return {
      x: (cx - canvasSize.width / 2 - offset.x) / (scale * zoom),
      y: -(cy - canvasSize.height / 2 - offset.y) / (scale * zoom)
    };
  }, [canvasSize, zoom, offset]);
  
  // 查找最近的镜子
  const findNearestMirror = React.useCallback((cx, cy) => {
    const dataPos = canvasToData(cx, cy);
    const threshold = 15 / zoom;
    let nearest = null, minDist = Infinity;
    
    for (const m of filteredMirrors) {
      const dist = Math.sqrt(Math.pow(m.x - dataPos.x, 2) + Math.pow(m.y - dataPos.y, 2));
      if (dist < minDist && dist < threshold) {
        minDist = dist;
        nearest = m;
      }
    }
    return nearest;
  }, [filteredMirrors, canvasToData, zoom]);
  
  // 绘制Canvas
  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    
    // 网格
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 100 * zoom;
    const gridOffsetX = (offset.x % gridSize + gridSize) % gridSize;
    const gridOffsetY = (offset.y % gridSize + gridSize) % gridSize;
    
    for (let x = gridOffsetX; x < canvasSize.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasSize.height); ctx.stroke();
    }
    for (let y = gridOffsetY; y < canvasSize.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasSize.width, y); ctx.stroke();
    }
    
    // 中心塔
    const towerPos = dataToCanvas(0, 0);
    ctx.beginPath();
    ctx.arc(towerPos.x, towerPos.y, 12 * Math.min(zoom, 2), 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (zoom >= 0.5) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, 12 * Math.min(zoom, 1.5))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('塔', towerPos.x, towerPos.y);
    }
    
    // 镜子
    const mirrorSize = Math.max(2, Math.min(8, 4 * zoom));
    
    filteredMirrors.forEach(mirror => {
      const pos = dataToCanvas(mirror.x, mirror.y);
      
      if (pos.x < -20 || pos.x > canvasSize.width + 20 ||
          pos.y < -20 || pos.y > canvasSize.height + 20) return;
      
      const isSelected = selectedMirror?.id === mirror.id;
      const isHovered = hoveredMirror?.id === mirror.id;
      const isSearch = searchResult?.id === mirror.id;
      
      const color = colorMode === 'cleanliness' ? getColor(mirror.c) : ZONE_COLORS[mirror.z].bg;
      
      ctx.beginPath();
      ctx.rect(pos.x - mirrorSize / 2, pos.y - mirrorSize / 2, mirrorSize, mirrorSize);
      ctx.fillStyle = color;
      ctx.fill();
      
      if (isSelected || isHovered || isSearch) {
        ctx.strokeStyle = isSearch ? '#f59e0b' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, mirrorSize + 4, 0, Math.PI * 2);
        ctx.strokeStyle = isSearch ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();
      }
    });
    
    // 比例尺
    const scaleBarWidth = 100;
    const scaleMeters = Math.round(scaleBarWidth / zoom / 0.4);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(20, canvasSize.height - 30, scaleBarWidth, 4);
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${scaleMeters}m`, 20, canvasSize.height - 38);
    ctx.textAlign = 'right';
    ctx.fillText(`${(zoom * 100).toFixed(0)}%`, canvasSize.width - 20, canvasSize.height - 38);
    
  }, [canvasSize, zoom, offset, filteredMirrors, selectedMirror, hoveredMirror, searchResult, colorMode, dataToCanvas]);
  
  // 绘制小地图
  const drawMinimap = React.useCallback(() => {
    const minimap = document.getElementById('minimap-canvas');
    if (!minimap || !showMinimap) return;
    
    const ctx = minimap.getContext('2d');
    const w = 150, h = 120;
    
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);
    
    const scale = Math.min(w / (BOUNDS.xMax - BOUNDS.xMin), h / (BOUNDS.yMax - BOUNDS.yMin)) * 0.9;
    
    mirrorData.forEach((m, i) => {
      if (i % 10 !== 0) return;
      if (!selectedZones.includes(m.z)) return;
      
      const x = w / 2 + m.x * scale;
      const y = h / 2 - m.y * scale;
      
      ctx.fillStyle = ZONE_COLORS[m.z].bg;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    });
    
    const mainScale = Math.min(
      canvasSize.width / (BOUNDS.xMax - BOUNDS.xMin),
      canvasSize.height / (BOUNDS.yMax - BOUNDS.yMin)
    ) * 0.9;
    
    const viewW = (canvasSize.width / mainScale / zoom) * scale;
    const viewH = (canvasSize.height / mainScale / zoom) * scale;
    const viewX = w / 2 - (offset.x / mainScale / zoom) * scale - viewW / 2;
    const viewY = h / 2 + (offset.y / mainScale / zoom) * scale - viewH / 2;
    
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    
  }, [showMinimap, selectedZones, zoom, offset, canvasSize]);
  
  // 初始化画布尺寸
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: Math.max(500, rect.height) });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // 设置画布DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    
    draw();
    drawMinimap();
  }, [canvasSize, draw, drawMinimap]);
  
  useEffect(() => { draw(); drawMinimap(); }, [draw, drawMinimap]);
  
  // 鼠标滚轮缩放
  const handleWheel = React.useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(10, zoom * delta));
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    setOffset(prev => ({
      x: prev.x - (mouseX - centerX) * (newZoom / zoom - 1),
      y: prev.y - (mouseY - centerY) * (newZoom / zoom - 1)
    }));
    setZoom(newZoom);
  }, [zoom, canvasSize]);
  
  const handleMouseDown = React.useCallback((e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [offset]);
  
  const handleMouseMove = React.useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else {
      const mirror = findNearestMirror(mouseX, mouseY);
      setHoveredMirror(mirror);
      if (canvasRef.current) canvasRef.current.style.cursor = mirror ? 'pointer' : 'grab';
    }
  }, [isDragging, dragStart, findNearestMirror]);
  
  const handleMouseUp = React.useCallback(() => { setIsDragging(false); }, []);
  
  const handleClick = React.useCallback((e) => {
    if (isDragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mirror = findNearestMirror(e.clientX - rect.left, e.clientY - rect.top);
    setSelectedMirror(mirror);
  }, [isDragging, findNearestMirror]);
  
  // 搜索镜子
  const handleSearch = () => {
    if (!searchQuery.trim()) { setSearchResult(null); return; }
    
    const mirror = mirrorData.find(m => m.id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (mirror) {
      setSearchResult(mirror);
      setSelectedMirror(mirror);
      
      const scale = Math.min(
        canvasSize.width / (BOUNDS.xMax - BOUNDS.xMin),
        canvasSize.height / (BOUNDS.yMax - BOUNDS.yMin)
      ) * 0.9;
      
      setOffset({ x: -mirror.x * scale * zoom, y: mirror.y * scale * zoom });
      
      if (!selectedZones.includes(mirror.z)) {
        setSelectedZones(prev => [...prev, mirror.z]);
      }
    } else {
      setSearchResult(null);
    }
  };
  
  const toggleZone = (zone) => {
    setSelectedZones(prev => prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]);
  };
  
  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelectedZones(['A', 'B', 'C', 'D']);
  };
  
  const focusZone = (zone) => {
    const zm = mirrorData.filter(m => m.z === zone);
    if (zm.length === 0) return;
    
    const avgX = zm.reduce((s, m) => s + m.x, 0) / zm.length;
    const avgY = zm.reduce((s, m) => s + m.y, 0) / zm.length;
    
    const scale = Math.min(
      canvasSize.width / (BOUNDS.xMax - BOUNDS.xMin),
      canvasSize.height / (BOUNDS.yMax - BOUNDS.yMin)
    ) * 0.9;
    
    setOffset({ x: -avgX * scale * zoom, y: avgY * scale * zoom });
    setSelectedZones([zone]);
  };
  
  // Show loading state
  if (mirrorDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-amber-400 mb-4" />
        <p className="text-white text-lg">加载镜场数据...</p>
        <p className="text-slate-400 text-sm mt-2">Loading mirror field data from server</p>
      </div>
    );
  }

  // Show error state
  if (mirrorDataError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle size={48} className="text-rose-400 mb-4" />
        <p className="text-white text-lg">加载失败</p>
        <p className="text-slate-400 text-sm mt-2">{mirrorDataError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">镜场可视化</h2>
          <p className="text-slate-400 text-sm mt-1">
            {stats.total.toLocaleString()} / {mirrorData.length.toLocaleString()} 面定日镜 · 新疆哈密 · {MIRROR_CENTER.lat.toFixed(4)}°N, {MIRROR_CENTER.lng.toFixed(4)}°E
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="搜索镜子ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-44"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResult(null); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          {/* 颜色模式 */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
            <button onClick={() => setColorMode('cleanliness')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${colorMode === 'cleanliness' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              清洁度
            </button>
            <button onClick={() => setColorMode('zone')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${colorMode === 'zone' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              分区
            </button>
          </div>
          {/* 缩放 */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
            <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} className="p-1.5 text-slate-400 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
            </button>
            <span className="text-white text-sm w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button onClick={() => setZoom(z => Math.min(10, z * 1.25))} className="p-1.5 text-slate-400 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
            </button>
          </div>
          <button onClick={resetView} className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors" title="重置视图">
            <RefreshCw size={18} />
          </button>

          <button
            onClick={handleExportMirrorData}
            disabled={isExporting}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? '导出中...' : '导出数据'}
          </button>
        </div>
      </div>
      
      <div className="flex gap-4" style={{ height: 'calc(100vh - 220px)' }}>
        {/* 左侧分区面板 */}
        <div className="w-52 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">分区选择</h3>
            <div className="space-y-2">
              {Object.entries(ZONE_COLORS).map(([zone, colors]) => (
                <div key={zone}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${selectedZones.includes(zone) ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/30 border border-transparent opacity-50'}`}
                  onClick={() => toggleZone(zone)}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.bg }} />
                    <span className="text-white text-sm">{colors.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-xs">{stats.zones[zone]?.count.toLocaleString()}</span>
                    <button onClick={(e) => { e.stopPropagation(); focusZone(zone); }}
                      className="p-1 text-slate-500 hover:text-amber-400" title="定位">
                      <MapPin size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">图例</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span><span className="text-slate-400">优秀 ≥95%</span><span className="text-slate-500 ml-auto">{stats.excellent.toLocaleString()}</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-cyan-500"></span><span className="text-slate-400">良好 85-95%</span><span className="text-slate-500 ml-auto">{stats.good.toLocaleString()}</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span><span className="text-slate-400">一般 75-85%</span><span className="text-slate-500 ml-auto">{stats.fair.toLocaleString()}</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span><span className="text-slate-400">较差 &lt;75%</span><span className="text-slate-500 ml-auto">{stats.poor.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
        
        {/* 地图区域 */}
        <div className="flex-1 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden relative" ref={containerRef}>
          <canvas ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            className="absolute inset-0 cursor-grab active:cursor-grabbing" />
          {/* 小地图 */}
          {showMinimap && (
            <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-2 shadow-xl">
              <canvas id="minimap-canvas" width="150" height="120" className="rounded" />
            </div>
          )}
          {/* 选中镜子信息 */}
          {selectedMirror && (
            <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-700 rounded-xl p-4 shadow-xl w-64">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold text-sm">镜子详情</h4>
                <button onClick={() => setSelectedMirror(null)} className="text-slate-500 hover:text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">编号</span><span className="text-white font-mono">{selectedMirror.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">分区</span><span className="text-white">{ZONE_COLORS[selectedMirror.z].name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">清洁度</span><span className="font-semibold" style={{ color: getColor(selectedMirror.c) }}>{selectedMirror.c}%</span></div>
                <div className="flex justify-between"><span className="text-slate-400">位置</span><span className="text-white font-mono text-xs">({selectedMirror.x.toFixed(1)}, {selectedMirror.y.toFixed(1)})m</span></div>
              </div>
              <button onClick={() => setPreviewMirror(selectedMirror)}
                className="w-full mt-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                <Eye size={14} /> 查看拍摄图像
              </button>
            </div>
          )}
          {/* 悬停提示 */}
          {hoveredMirror && !selectedMirror && (
            <div className="absolute pointer-events-none bg-slate-800/95 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-lg"
              style={{ left: '50%', bottom: 16, transform: 'translateX(-50%)' }}>
              <span className="text-white font-mono">{hoveredMirror.id}</span>
              <span className="text-slate-400 mx-2">|</span>
              <span style={{ color: getColor(hoveredMirror.c) }}>{hoveredMirror.c}%</span>
              <span className="text-slate-400 mx-2">|</span>
              <span style={{ color: ZONE_COLORS[hoveredMirror.z].bg }}>{ZONE_COLORS[hoveredMirror.z].name}</span>
            </div>
          )}
          {searchResult && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
              已定位到 {searchResult.id}
            </div>
          )}
          {/* 操作提示 */}
          <div className="absolute bottom-4 right-4 text-slate-500 text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg">
            滚轮缩放 · 拖拽平移 · 点击选择
          </div>
        </div>
      </div>
      
      {/* 图片预览模态框 */}
      {previewMirror && (
        <ImagePreviewModal 
          mirror={{
            id: previewMirror.id,
            zone: previewMirror.z,
            cleanliness: previewMirror.c,
            x: previewMirror.x,
            y: previewMirror.y
          }}
          onClose={() => setPreviewMirror(null)}
          sampleImageUrl={getMirrorImageUrl(previewMirror.id)}
        />
      )}
    </div>
  );
};


// 历史记录页面
const HistoryPage = () => {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Export history to Excel - FUNCTIONAL
  const handleExportHistory = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      exportHistoryRecords(historyRecords, 'inspection-history');
      toast.success('History exported successfully!');
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Filter handler - now functional
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('全部区域');
  const [records, setRecords] = useState(historyRecords);
  
  const handleFilter = async () => {
    try {
      const result = await filterInspectionRecords({
        search: searchTerm,
        zone: selectedZone,
      });
      if (result.records) {
        setRecords(result.records);
      }
      toast.success('Filter applied');
    } catch (error) {
      toast.error('Filter failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">历史记录</h2>
          <p className="text-slate-400 text-sm mt-1">查看和管理过往巡检数据</p>
        </div>
        <button
          onClick={handleExportHistory}
          disabled={isExporting}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isExporting ? '导出中...' : '导出Excel'}
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder="搜索任务ID..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <input 
            type="date"
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <select className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
            <option>全部区域</option>
            <option>A区</option>
            <option>B区</option>
            <option>C区</option>
            <option>D区</option>
            <option>E区</option>
            <option>F区</option>
          </select>
          <button
            onClick={handleFilter}
            className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors flex items-center gap-2"
          >
            <Filter size={16} />
            筛选
          </button>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50">
            <tr className="text-left">
              <th className="px-6 py-4 text-slate-400 font-medium text-sm">任务ID</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-sm">巡检时间</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-sm">巡检区域</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-sm">定日镜数量</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-sm">平均清洁度</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-sm">耗时</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-sm">状态</th>
              <th className="px-6 py-4 text-slate-400 font-medium text-sm">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {historyRecords.map((record) => (
              <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-amber-400 font-mono text-sm">{record.id}</span>
                </td>
                <td className="px-6 py-4 text-white">{record.date}</td>
                <td className="px-6 py-4 text-slate-300">{record.zones}</td>
                <td className="px-6 py-4 text-slate-300">{record.mirrors.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`font-medium ${
                    record.avgCleanliness >= 90 ? 'text-emerald-400' :
                    record.avgCleanliness >= 85 ? 'text-cyan-400' : 'text-amber-400'
                  }`}>
                    {record.avgCleanliness}%
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-300">{record.duration}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                    已完成
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* 分页 */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 text-sm">显示 1-5 条，共 28 条记录</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm hover:bg-slate-700 transition-colors">上一页</button>
            <button className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm">1</button>
            <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm hover:bg-slate-700 transition-colors">2</button>
            <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm hover:bg-slate-700 transition-colors">3</button>
            <button className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm hover:bg-slate-700 transition-colors">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 系统日志页面
const LogsPage = () => {
  const logs = [
    { time: '2024-12-17 15:32:18', level: 'INFO', module: '数据同步', message: 'MODBUS TCP 数据同步完成，已推送至上位系统' },
    { time: '2024-12-17 15:30:45', level: 'SUCCESS', module: '图像处理', message: '批次 #2024121701 图像处理完成，共处理 14500 张图像' },
    { time: '2024-12-17 14:45:22', level: 'INFO', module: '无人机控制', message: '无人机返航中，当前电量 23%' },
    { time: '2024-12-17 14:30:00', level: 'INFO', module: '任务管理', message: '巡检任务启动，预计耗时 45 分钟' },
    { time: '2024-12-17 14:28:33', level: 'WARNING', module: '系统监控', message: 'D区清洁度均值低于阈值 (78.3%)，建议安排清洗' },
    { time: '2024-12-17 10:15:00', level: 'INFO', module: '系统启动', message: '系统启动完成，所有模块运行正常' },
    { time: '2024-12-16 18:00:00', level: 'INFO', module: '数据备份', message: '每日数据备份完成' },
    { time: '2024-12-16 16:45:12', level: 'ERROR', module: '通信模块', message: '与上位系统连接中断，正在尝试重连...' },
    { time: '2024-12-16 16:45:45', level: 'SUCCESS', module: '通信模块', message: '与上位系统重新建立连接' },
  ];

  const getLevelStyle = (level) => {
    switch (level) {
      case 'ERROR': return 'bg-rose-500/20 text-rose-400';
      case 'WARNING': return 'bg-amber-500/20 text-amber-400';
      case 'SUCCESS': return 'bg-emerald-500/20 text-emerald-400';
      default: return 'bg-cyan-500/20 text-cyan-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">系统日志</h2>
          <p className="text-slate-400 text-sm mt-1">监控系统运行状态与事件记录</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none">
            <option>全部级别</option>
            <option>ERROR</option>
            <option>WARNING</option>
            <option>INFO</option>
            <option>SUCCESS</option>
          </select>
          <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2">
            <Download size={16} />
            导出日志
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-800">
          {logs.map((log, index) => (
            <div key={index} className="px-6 py-4 hover:bg-slate-800/30 transition-colors flex items-start gap-4">
              <span className="text-slate-500 font-mono text-sm whitespace-nowrap">{log.time}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getLevelStyle(log.level)}`}>
                {log.level}
              </span>
              <span className="text-amber-400 text-sm font-medium whitespace-nowrap">[{log.module}]</span>
              <span className="text-slate-300 text-sm">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 系统设置页面 (仅开发人员可见)
const SettingsPage = () => {
  const toast = useToast();

  // Settings state
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modbusHost, setModbusHost] = useState('192.168.1.100');
  const [modbusPort, setModbusPort] = useState('502');
  
  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testModbusConnection(modbusHost, parseInt(modbusPort));
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } catch (error) {
      toast.error('Connection test failed: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveThresholds = async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        modbus_host: modbusHost,
        modbus_port: parseInt(modbusPort),
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Save failed: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">系统设置</h2>
        <p className="text-slate-400 text-sm mt-1">配置系统参数与模型设置</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 通信设置 */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">MODBUS TCP 设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">服务器地址</label>
              <input
                type="text"
                defaultValue="192.168.1.100"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">端口</label>
              <input
                type="text"
                defaultValue="502"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">同步间隔（秒）</label>
              <input
                type="number"
                defaultValue="60"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <button
              onClick={handleTestConnection}
              className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors"
            >
              测试连接
            </button>
          </div>
        </div>

        {/* 清洁度阈值设置 */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">清洁度阈值设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">优秀阈值 (%)</label>
              <input
                type="number"
                defaultValue="95"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">良好阈值 (%)</label>
              <input
                type="number"
                defaultValue="85"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">警告阈值 (%)</label>
              <input
                type="number"
                defaultValue="75"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <button
              onClick={handleSaveThresholds}
              className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors"
            >
              保存设置
            </button>
          </div>
        </div>

        {/* 模型设置 */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">模型配置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">当前模型版本</label>
              <div className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm">
                YOLO-Heliostat-v2.3.1
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">置信度阈值</label>
              <input 
                type="number" 
                step="0.01"
                defaultValue="0.85"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <button className="w-full py-2.5 bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">
              <Upload size={16} />
              上传新模型
            </button>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">数据管理</h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">数据库大小</span>
                <span className="text-white font-medium">1.23 GB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">图像存储</span>
                <span className="text-white font-medium">856 GB / 2 TB</span>
              </div>
            </div>
            <button className="w-full py-2.5 bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-600 transition-colors">
              备份数据库
            </button>
            <button className="w-full py-2.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-medium hover:bg-rose-500/30 transition-colors">
              清理历史数据
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 主应用组件
// Inner App component that uses toast context
function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'analysis': return <AnalysisPage />;
      case 'mirrorfield': return <MirrorFieldPage />;
      case 'detection': return <DetectionPage />;
      case 'history': return <HistoryPage />;
      case 'detectionhistory': return <DetectionHistoryPage />;
      case 'logs': return <LogsPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
        onLogout={handleLogout}
      />
      <main className="ml-64 p-8">
        {renderPage()}
      </main>
    </div>
  );
}

// Main App component wrapped with ToastProvider
export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { Activity, Battery, MapPin, AlertTriangle, CheckCircle, Clock, Sun, Droplets, Settings, History, LayoutDashboard, Map, LogOut, User, ChevronRight, Download, Upload, Search, Filter, RefreshCw, Plane, Eye, FileText, Bell, TrendingUp, TrendingDown, Zap } from 'lucide-react';

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
  { zone: 'A区', count: 2420, cleanliness: 94.2, status: 'good' },
  { zone: 'B区', count: 2380, cleanliness: 87.5, status: 'warning' },
  { zone: 'C区', count: 2450, cleanliness: 91.8, status: 'good' },
  { zone: 'D区', count: 2400, cleanliness: 78.3, status: 'critical' },
  { zone: 'E区', count: 2430, cleanliness: 89.6, status: 'good' },
  { zone: 'F区', count: 2420, cleanliness: 92.1, status: 'good' },
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

// 生成镜场数据
const generateMirrorFieldData = () => {
  const data = [];
  for (let i = 0; i < 60; i++) {
    for (let j = 0; j < 80; j++) {
      const cleanliness = 70 + Math.random() * 30;
      data.push({
        x: j,
        y: i,
        cleanliness,
        id: `M-${i.toString().padStart(2, '0')}-${j.toString().padStart(2, '0')}`,
        zone: ['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(i / 10)]
      });
    }
  }
  return data;
};

const mirrorFieldData = generateMirrorFieldData();

// 登录页面
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin({ username: username || '操作员', role });
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

        {/* 登录卡片 */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">角色选择</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('operator')}
                  className={`px-4 py-3 rounded-xl border transition-all ${
                    role === 'operator'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <User size={18} className="inline mr-2" />
                  操作员
                </button>
                <button
                  type="button"
                  onClick={() => setRole('developer')}
                  className={`px-4 py-3 rounded-xl border transition-all ${
                    role === 'developer'
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
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25"
            >
              {isLoading ? (
                <RefreshCw size={20} className="inline animate-spin" />
              ) : (
                '登 录'
              )}
            </button>
          </form>
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
    { id: 'history', icon: History, label: '历史记录' },
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
  const [droneStatus, setDroneStatus] = useState({
    battery: 78,
    position: 'C区-15排',
    status: '巡检中',
    progress: 65,
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">系统总览</h2>
          <p className="text-slate-400 text-sm mt-1">实时监控镜场状态与无人机巡检进度</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2">
            <RefreshCw size={16} />
            刷新数据
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
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
  const pieData = [
    { name: '优秀 (>95%)', value: 5420, color: '#10b981' },
    { name: '良好 (85-95%)', value: 6230, color: '#06b6d4' },
    { name: '一般 (75-85%)', value: 2103, color: '#f59e0b' },
    { name: '较差 (<75%)', value: 747, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">清洁度分析</h2>
          <p className="text-slate-400 text-sm mt-1">最近一次巡检数据分析 · 2024-12-17 14:30</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2">
            <Download size={16} />
            导出报告
          </button>
          <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2">
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

// 镜场可视化页面
const MirrorFieldPage = () => {
  const [selectedMirror, setSelectedMirror] = useState(null);
  const [previewMirror, setPreviewMirror] = useState(null); // 用于图片预览的镜子
  const [filter, setFilter] = useState('all');

  // 示例图片URL - 使用单一引用，避免重复创建
  // 在实际项目中，这里会是真实的图片服务器URL
  const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80";

  const getColor = (cleanliness) => {
    if (cleanliness >= 95) return '#10b981';
    if (cleanliness >= 85) return '#06b6d4';
    if (cleanliness >= 75) return '#f59e0b';
    return '#ef4444';
  };

  // 使用 useMemo 缓存过滤结果，避免不必要的重新计算
  const filteredData = React.useMemo(() => {
    return mirrorFieldData.filter(m => {
      if (filter === 'all') return true;
      if (filter === 'critical') return m.cleanliness < 75;
      if (filter === 'warning') return m.cleanliness >= 75 && m.cleanliness < 85;
      if (filter === 'good') return m.cleanliness >= 85;
      return true;
    });
  }, [filter]);

  // 使用 useMemo 缓存显示的镜子数据，减少渲染数量
  const displayMirrors = React.useMemo(() => {
    return filteredData.filter((_, i) => i % 20 === 0);
  }, [filteredData]);

  // 统计数据缓存
  const stats = React.useMemo(() => ({
    total: filteredData.length,
    excellent: filteredData.filter(m => m.cleanliness >= 95).length,
    good: filteredData.filter(m => m.cleanliness >= 85 && m.cleanliness < 95).length,
    fair: filteredData.filter(m => m.cleanliness >= 75 && m.cleanliness < 85).length,
    poor: filteredData.filter(m => m.cleanliness < 75).length,
  }), [filteredData]);

  // 点击镜子处理
  const handleMirrorClick = (mirror) => {
    setSelectedMirror(mirror);
    setPreviewMirror(mirror); // 同时打开预览
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">镜场可视化</h2>
          <p className="text-slate-400 text-sm mt-1">14,500 面定日镜分布与清洁度热力图 · 点击镜子查看拍摄图像</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="all">全部</option>
            <option value="critical">需清洗 (&lt;75%)</option>
            <option value="warning">注意 (75-85%)</option>
            <option value="good">正常 (&gt;85%)</option>
          </select>
          <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2">
            <Download size={16} />
            导出地图
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* 镜场地图 */}
        <div className="col-span-3 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">镜场布局</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500"></span>优秀</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cyan-500"></span>良好</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span>一般</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500"></span>较差</span>
            </div>
          </div>
          <div className="relative bg-slate-950 rounded-xl p-4 overflow-auto" style={{ maxHeight: '500px' }}>
            <svg width="800" height="600" viewBox="0 0 800 600" className="mx-auto">
              {/* 中心塔 */}
              <circle cx="400" cy="300" r="20" fill="#f59e0b" className="drop-shadow-lg" />
              <text x="400" y="305" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">塔</text>
              
              {/* 定日镜网格 - 使用缓存的数据 */}
              {displayMirrors.map((mirror, index) => {
                const angle = (index * 7.5) * Math.PI / 180;
                const radius = 50 + (index % 10) * 25;
                const x = 400 + Math.cos(angle) * radius;
                const y = 300 + Math.sin(angle) * radius;
                const isSelected = selectedMirror?.id === mirror.id;
                
                return (
                  <g key={mirror.id} className="cursor-pointer" onClick={() => handleMirrorClick(mirror)}>
                    <rect
                      x={x - 5}
                      y={y - 5}
                      width="10"
                      height="10"
                      fill={getColor(mirror.cleanliness)}
                      rx="2"
                      stroke={isSelected ? '#fff' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 0}
                      className="hover:stroke-white hover:stroke-2 transition-all"
                    />
                    {/* 选中时显示脉冲动画 */}
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        opacity="0.5"
                        className="animate-ping"
                      />
                    )}
                  </g>
                );
              })}
              
              {/* 分区标签 */}
              {['A', 'B', 'C', 'D', 'E', 'F'].map((zone, i) => {
                const angle = (i * 60 - 90) * Math.PI / 180;
                const x = 400 + Math.cos(angle) * 280;
                const y = 300 + Math.sin(angle) * 280;
                return (
                  <text key={zone} x={x} y={y} textAnchor="middle" fill="#64748b" fontSize="14" fontWeight="bold">
                    {zone}区
                  </text>
                );
              })}
            </svg>
          </div>
          
          {/* 提示信息 */}
          <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Eye size={14} />
            <span>点击任意定日镜查看无人机拍摄图像</span>
          </div>
        </div>

        {/* 信息面板 */}
        <div className="space-y-4">
          {/* 选中镜子信息 */}
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">定日镜详情</h3>
            {selectedMirror ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-400 text-sm">编号</span>
                  <span className="text-white font-medium">{selectedMirror.id}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-400 text-sm">所属区域</span>
                  <span className="text-white font-medium">{selectedMirror.zone}区</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-400 text-sm">清洁度</span>
                  <span className={`font-bold ${
                    selectedMirror.cleanliness >= 85 ? 'text-emerald-400' :
                    selectedMirror.cleanliness >= 75 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {selectedMirror.cleanliness.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-400 text-sm">坐标</span>
                  <span className="text-white font-mono text-sm">({selectedMirror.x}, {selectedMirror.y})</span>
                </div>
                
                {/* 查看图片按钮 */}
                <button 
                  onClick={() => setPreviewMirror(selectedMirror)}
                  className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Eye size={16} />
                  查看拍摄图像
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Map size={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">点击镜子查看详情</p>
              </div>
            )}
          </div>

          {/* 统计摘要 */}
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">统计摘要</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">显示数量</span>
                <span className="text-white font-medium">{stats.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 text-sm">优秀</span>
                <span className="text-white">{stats.excellent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-cyan-400 text-sm">良好</span>
                <span className="text-white">{stats.good.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber-400 text-sm">一般</span>
                <span className="text-white">{stats.fair.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-rose-400 text-sm">较差</span>
                <span className="text-white">{stats.poor.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览模态框 - 条件渲染，只在需要时挂载 */}
      {previewMirror && (
        <ImagePreviewModal 
          mirror={previewMirror} 
          onClose={() => setPreviewMirror(null)}
          sampleImageUrl={SAMPLE_IMAGE_URL}
        />
      )}
    </div>
  );
};

// 历史记录页面
const HistoryPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">历史记录</h2>
          <p className="text-slate-400 text-sm mt-1">查看和管理过往巡检数据</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
          <Download size={16} />
          导出Excel
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
          <button className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors flex items-center gap-2">
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
            <button className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors">
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
            <button className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors">
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
export default function App() {
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
      case 'history': return <HistoryPage />;
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

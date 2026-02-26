import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardHome from './pages/DashboardHome';
import StructureMap from './pages/StructureMap';
import IssuesLog from './pages/IssuesLog';
import QualityReports from './pages/QualityReports';
import AgentDiscovery from './pages/AgentDiscovery';
import AgentAnalysis from './pages/AgentAnalysis';
import AgentReporting from './pages/AgentReporting';
import KnowledgeGraph from './pages/KnowledgeGraph';
import AgentInspector from './pages/AgentInspector';
import AgentStrategist from './pages/AgentStrategist';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardHome />} />
          <Route path="structure" element={<StructureMap />} />
          <Route path="issues" element={<IssuesLog />} />
          <Route path="reports" element={<QualityReports />} />

          {/* Agent Pages */}
          <Route path="agent/discovery" element={<AgentDiscovery />} />
          <Route path="agent/analysis" element={<AgentAnalysis />} />
          <Route path="agent/reporting" element={<AgentReporting />} />
          <Route path="knowledge-graph" element={<KnowledgeGraph mode="health" />} />
          <Route path="topology" element={<KnowledgeGraph mode="topology" />} />
          <Route path="agent/inspector" element={<AgentInspector />} />
          <Route path="agent/strategist" element={<AgentStrategist />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

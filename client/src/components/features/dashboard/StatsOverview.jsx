import { Activity, CheckCircle, Layers, TrendingUp } from "lucide-react";
import React from "react";
import { Card, Col, ProgressBar, Row } from "react-bootstrap";

/**
 * StatsOverview: A "Feature" Component
 * 
 * This component demonstrates how we encapsulate specific logic (like calculating 
 * workspace-wide statistics) into a reusable feature component.
 */
const StatsOverview = ({ projects = [] }) => {
  // Logic: Calculate totals across all projects
  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.statistics?.total_tasks || 0), 0);
  const completedTasks = projects.reduce((acc, p) => acc + (p.statistics?.completed_tasks || 0), 0);
  const activeTasks = totalTasks - completedTasks;
  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = [
    {
      label: "Total Projects",
      value: totalProjects,
      icon: <Layers size={20} />,
      color: "primary",
      bg: "rgba(99, 102, 241, 0.1)",
    },
    {
      label: "Active Missions",
      value: activeTasks,
      icon: <Activity size={20} />,
      color: "warning",
      bg: "rgba(245, 158, 11, 0.1)",
    },
    {
      label: "Verified Complete",
      value: completedTasks,
      icon: <CheckCircle size={20} />,
      color: "success",
      bg: "rgba(16, 185, 129, 0.1)",
    },
    {
      label: "Efficiency Rate",
      value: `${successRate}%`,
      icon: <TrendingUp size={20} />,
      color: "info",
      bg: "rgba(6, 182, 212, 0.1)",
    },
  ];

  return (
    <div className="stats-overview-feature mb-5">
      <Row className="g-4">
        {stats.map((stat, idx) => (
          <Col key={idx} xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100 transition-all hvr-lift">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div 
                    className="p-3 rounded-4 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: stat.bg, color: `var(--bs-${stat.color})` }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-muted small fw-bold text-uppercase tracking-wider">
                      {stat.label}
                    </div>
                    <div className="h3 mb-0 fw-bold">{stat.value}</div>
                  </div>
                </div>
                {stat.label === "Efficiency Rate" && (
                  <ProgressBar 
                    now={successRate} 
                    variant="info" 
                    className="rounded-pill" 
                    style={{ height: '6px' }} 
                  />
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default StatsOverview;

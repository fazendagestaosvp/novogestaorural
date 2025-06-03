import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Heart, Database, TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    cattle: number;
    horses: number;
    healthRecords: number;
    documents: number;
  };
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const statItems = [
    {
      title: "Total de Gado",
      value: stats.cattle.toString(),
      change: `${stats.cattle} total`,
      icon: Activity,
      color: "text-green-600"
    },
    {
      title: "Cavalos Registrados",
      value: stats.horses.toString(),
      change: `${stats.horses} total`,
      icon: Heart,
      color: "text-blue-600"
    },
    {
      title: "Registros de Saúde",
      value: stats.healthRecords.toString(),
      change: `${stats.healthRecords} registros`,
      icon: Database,
      color: "text-purple-600"
    },
    {
      title: "Documentos",
      value: stats.documents.toString(),
      change: `${stats.documents} arquivos`,
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  // The statItems array uses the stats passed as props

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`rounded-full p-2 ${stat.color} bg-opacity-10`}>
              {React.createElement(stat.icon, { className: `h-4 w-4 ${stat.color}` })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

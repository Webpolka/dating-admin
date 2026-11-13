// app/(admin)/dashboard/_components/dashboard-charts.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import type { DashboardStats } from "@/lib/api/dashboard";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis } from "recharts";

const CHART_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
];

interface DashboardChartsProps {
  stats: DashboardStats;
  role: string;
}

export function DashboardCharts({ stats, role }: DashboardChartsProps) {
  // КОНФИГИ
  const revenueChartConfig = { revenue: { label: "Выручка", color: "var(--chart-1)" } };
  const regChartConfig = { registrations: { label: "Регистрации", color: "var(--chart-2)" } };
  const activityChartConfig = {
    swipes: { label: "Свайпы", color: "var(--chart-1)" },
    matches: { label: "Мэтчи", color: "var(--chart-2)" },
    messages: { label: "Сообщения", color: "var(--chart-3)" },
  };
  const genderChartConfig = {
    male: { label: "Мужчины", color: "var(--chart-3)" },
    female: { label: "Женщины", color: "var(--chart-5)" },
  };
  const ageChartConfig = { count: { label: "Пользователи", color: "var(--chart-2)" } };

  // ДАННЫЕ
  const revenueData = stats.revenueCategories?.map((cat, i) => ({ date: cat, revenue: stats.revenueData?.[i] || 0 })) || [];
  const regData = stats.registrationCategories?.map((cat, i) => ({ date: cat, registrations: stats.registrationData?.[i] || 0 })) || [];
  const activityData = stats.activityData?.categories.map((cat, i) => ({
    date: cat, swipes: stats.activityData?.swipes[i] || 0,
    matches: stats.activityData?.matches[i] || 0, messages: stats.activityData?.messages[i] || 0
  })) || [];

  const totalGender = (stats.genderStats?.male || 0) + (stats.genderStats?.female || 0);
  const malePercent = totalGender > 0 ? Math.round(((stats.genderStats?.male || 0) / totalGender) * 100) : 0;
  const femalePercent = totalGender > 0 ? Math.round(((stats.genderStats?.female || 0) / totalGender) * 100) : 0;
  const genderData = [
    { name: "male", value: stats.genderStats?.male || 0, fill: "var(--chart-3)" },
    { name: "female", value: stats.genderStats?.female || 0, fill: "var(--chart-5)" },
  ];

  const ageData = stats.ageStats ? Object.entries(stats.ageStats).map(([k, v]) => ({ name: k, count: v })) : [];
  const cityData = stats.topCities ? Object.entries(stats.topCities).map(([k, v]) => ({ name: k, total: v })) : [];

  // ============================================================
  // АДМИН (Выручка, Регистрации, Активность, Пол, Возраст, Города)
  // ============================================================
  if (role === 'admin') {
    return (
      <div className="space-y-6">
        {/* Ряд 1: Выручка + Регистрации */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Выручка (30 дней)</CardTitle>
                <Badge className="bg-green-400 text-primary-foreground">{stats.revenue30DaysTotal?.toLocaleString('ru-RU')} ₽</Badge>
              </div>
              <CardDescription>Сумма успешных транзакций по дням</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={revenueChartConfig} className="w-full h-62.5">
                <AreaChart data={revenueData} margin={{ left: 12, right: 12, top: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} hide />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Area dataKey="revenue" type="natural" fill="var(--color-revenue)" fillOpacity={0.4} stroke="var(--color-revenue)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Регистрации (30 дней)</CardTitle>
                <Badge variant="default">{stats.registrations30DaysTotal} шт.</Badge>
              </div>
              <CardDescription>Динамика притока новых пользователей</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={regChartConfig} className="w-full h-62.5">
                <AreaChart data={regData} margin={{ left: 12, right: 12, top: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} hide />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Area dataKey="registrations" type="natural" fill="var(--color-registrations)" fillOpacity={0.4} stroke="var(--color-registrations)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Ряд 2: Активность (на всю ширину) */}
        <Card>
          <CardHeader>
            <CardTitle>Активность платформы (7 дней)</CardTitle>
            <CardDescription>Свайпы, мэтчи и отправленные сообщения</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activityChartConfig} className="w-full h-75">
              <LineChart data={activityData} margin={{ left: 12, right: 12, top: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="swipes" type="monotone" stroke="var(--color-swipes)" strokeWidth={2} dot={false} />
                <Line dataKey="matches" type="monotone" stroke="var(--color-matches)" strokeWidth={2} dot={false} />
                <Line dataKey="messages" type="monotone" stroke="var(--color-messages)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Ряд 3: Пол + Возраст */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Соотношение по полу</CardTitle>
              <CardDescription>М: {malePercent}% / Ж: {femalePercent}%</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={genderChartConfig} className="w-full h-62.5">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Возрастное распределение</CardTitle>
              <CardDescription>Количество пользователей по возрастным группам</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={ageChartConfig} className="w-full h-62.5">
                <BarChart data={ageData} margin={{ left: 12, right: 12, top: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} hide />
                  <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {ageData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Ряд 4: Города */}
        <Card>
          <CardHeader>
            <CardTitle>Топ городов</CardTitle>
            <CardDescription>Распределение по городам России</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ageChartConfig} className="w-full h-81.25">
              <BarChart data={cityData} layout="vertical" margin={{ left: 20, right: 12, top: 12 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {cityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // МОДЕРАТОР (Регистрации + Активность)
  // ============================================================
  if (role === 'moderator') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Регистрации (30 дней)</CardTitle>
              <Badge variant="default">{stats.registrations30DaysTotal} шт.</Badge>
            </div>
            <CardDescription>Динамика притока новых пользователей</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={regChartConfig} className="w-full h-62.5">
              <AreaChart data={regData} margin={{ left: 12, right: 12, top: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} hide />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area dataKey="registrations" type="natural" fill="var(--color-registrations)" fillOpacity={0.4} stroke="var(--color-registrations)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Активность платформы (7 дней)</CardTitle>
            <CardDescription>Свайпы, мэтчи и отправленные сообщения</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activityChartConfig} className="w-full h-75">
              <LineChart data={activityData} margin={{ left: 12, right: 12, top: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="swipes" type="monotone" stroke="var(--color-swipes)" strokeWidth={2} dot={false} />
                <Line dataKey="matches" type="monotone" stroke="var(--color-matches)" strokeWidth={2} dot={false} />
                <Line dataKey="messages" type="monotone" stroke="var(--color-messages)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // САППОРТ (Регистрации)
  // ============================================================
  if (role === 'support') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Регистрации (30 дней)</CardTitle>
            <Badge variant="default">{stats.registrations30DaysTotal} шт.</Badge>
          </div>
          <CardDescription>Динамика притока новых пользователей</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={regChartConfig} className="w-full h-62.5">
            <AreaChart data={regData} margin={{ left: 12, right: 12, top: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} hide />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area dataKey="registrations" type="natural" fill="var(--color-registrations)" fillOpacity={0.4} stroke="var(--color-registrations)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  return null;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-300 mt-2">
              Welcome to WTF Growth OS
            </p>
          </div>
          <Link href="/call-lab">
            <Button size="lg">
              Analyze New Call
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Calls</CardTitle>
              <CardDescription>Analyzed this month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">Coming Soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Score</CardTitle>
              <CardDescription>Your call quality</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">Coming Soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Improvement</CardTitle>
              <CardDescription>vs last month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">Coming Soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>
              Your call analysis history will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No calls analyzed yet. Start by analyzing your first call!
              </p>
              <Link href="/call-lab">
                <Button>
                  Analyze Your First Call
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>🎯 Call Lab</CardTitle>
              <CardDescription>
                Get instant feedback on your sales calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/call-lab">
                <Button className="w-full">Launch Call Lab</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📊 Rep Trends</CardTitle>
              <CardDescription>
                Track your performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Coming in Phase 2
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

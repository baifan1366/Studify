'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';

interface DebugStatusProps {
  classroomSlug: string;
}

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function DebugStatus({ classroomSlug }: DebugStatusProps) {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const initialTests: TestResult[] = [
    { name: 'Database Tables', status: 'pending', message: 'Checking table access...' },
    { name: 'Authentication', status: 'pending', message: 'Verifying user auth...' },
    { name: 'Classroom Access', status: 'pending', message: 'Testing classroom permissions...' },
    { name: 'Whiteboard API', status: 'pending', message: 'Testing whiteboard endpoints...' },
    { name: 'Event System', status: 'pending', message: 'Testing event creation...' },
  ];

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTests(initialTests);

    const updateTest = (index: number, status: TestResult['status'], message: string, details?: any) => {
      setTests(prev => prev.map((test, i) => 
        i === index ? { ...test, status, message, details } : test
      ));
    };

    try {
      // Test 1: Database Tables
      updateTest(0, 'pending', 'Checking database tables...');
      const dbResponse = await fetch('/api/debug/whiteboard');
      const dbData = await dbResponse.json();
      
      if (dbResponse.ok) {
        const tableCount = Object.keys(dbData.tableData || {}).length;
        updateTest(0, 'success', `✅ ${tableCount} tables accessible`, dbData.tableData);
      } else {
        updateTest(0, 'error', `❌ Database error: ${dbData.error}`, dbData);
      }

      // Test 2: Authentication
      updateTest(1, 'pending', 'Checking authentication...');
      const authResponse = await fetch('/api/auth/me', { credentials: 'include' });
      const authData = await authResponse.json();
      
      if (authResponse.ok) {
        updateTest(1, 'success', `✅ User: ${authData.display_name || authData.email} (${authData.role})`, authData);
      } else {
        updateTest(1, 'error', `❌ Auth error: ${authData.error}`, authData);
      }

      // Test 3: Classroom Access
      updateTest(2, 'pending', 'Testing classroom access...');
      const classroomResponse = await fetch(`/api/classroom/${classroomSlug}/whiteboard`, { credentials: 'include' });
      const classroomData = await classroomResponse.json();
      
      if (classroomResponse.ok) {
        updateTest(2, 'success', `✅ Classroom accessible, ${classroomData.length} whiteboards found`, classroomData);
      } else {
        updateTest(2, 'error', `❌ Classroom error: ${classroomData.error}`, classroomData);
      }

      // Test 4: Whiteboard API (only if classroom accessible)
      if (classroomResponse.ok && authData.role === 'tutor') {
        updateTest(3, 'pending', 'Testing whiteboard creation...');
        const createResponse = await fetch(`/api/classroom/${classroomSlug}/whiteboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_id: '1', title: 'Debug Test Whiteboard' })
        });
        const createData = await createResponse.json();
        
        if (createResponse.ok) {
          updateTest(3, 'success', `✅ Whiteboard created: ${createData.title}`, createData);
          
          // Test 5: Event System
          updateTest(4, 'pending', 'Testing event system...');
          const eventResponse = await fetch(`/api/classroom/${classroomSlug}/whiteboard/${createData.id}/events`, {
            credentials: 'include'
          });
          const eventData = await eventResponse.json();
          
          if (eventResponse.ok) {
            updateTest(4, 'success', `✅ Event system working, ${eventData.length} events`, eventData);
          } else {
            updateTest(4, 'error', `❌ Event error: ${eventData.error}`, eventData);
          }
        } else {
          updateTest(3, 'error', `❌ Whiteboard creation failed: ${createData.error}`, createData);
          updateTest(4, 'warning', '⚠️ Skipped - whiteboard creation failed');
        }
      } else {
        updateTest(3, 'warning', '⚠️ Skipped - not a tutor or classroom inaccessible');
        updateTest(4, 'warning', '⚠️ Skipped - whiteboard API test failed');
      }

    } catch (error) {
      console.error('Diagnostic error:', error);
      setTests(prev => prev.map(test => 
        test.status === 'pending' ? { ...test, status: 'error', message: '❌ Unexpected error' } : test
      ));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>🎨 Whiteboard System Status</CardTitle>
            <Button onClick={runDiagnostics} disabled={isRunning}>
              {isRunning ? 'Running...' : 'Re-run Tests'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <span className="font-medium">{test.name}</span>
                    <p className="text-sm text-gray-600">{test.message}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(test.status)}>
                  {test.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🔗 Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href={`/api/debug/whiteboard`} target="_blank" rel="noopener">
                <ExternalLink className="w-4 h-4 mr-2" />
                Database Test API
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href={`/en/classroom/${classroomSlug}/whiteboard`} target="_blank" rel="noopener">
                <ExternalLink className="w-4 h-4 mr-2" />
                Main Whiteboard
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href={`/en/classroom/${classroomSlug}/whiteboard/test`} target="_blank" rel="noopener">
                <ExternalLink className="w-4 h-4 mr-2" />
                Test Interface
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">📊 System Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Classroom:</strong> {classroomSlug}</div>
            <div><strong>API Base:</strong> /api/classroom/{classroomSlug}/whiteboard</div>
            <div><strong>Tables:</strong> classroom_whiteboard_session, classroom_whiteboard_event</div>
            <div><strong>Auth:</strong> JWT + Profile ID mapping</div>
          </CardContent>
        </Card>
      </div>

      {tests.some(t => t.details) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🔍 Detailed Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test, index) => 
                test.details && (
                  <div key={index} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">{test.name}</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

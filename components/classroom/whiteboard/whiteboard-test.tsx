'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface WhiteboardTestProps {
  classroomSlug: string;
}

export default function WhiteboardTest({ classroomSlug }: WhiteboardTestProps) {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('1');

  const testAPI = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      return {
        status: response.status,
        ok: response.ok,
        data,
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResult('Running tests...\n\n');
    
    let results = '';

    // Test 1: Debug route
    results += '🔍 Test 1: Database Access\n';
    const debugResult = await testAPI('/api/debug/whiteboard');
    results += `Status: ${debugResult.status}\n`;
    results += `Success: ${debugResult.ok}\n`;
    if (debugResult.ok) {
      results += `Tables accessible: ${Object.keys(debugResult.data.tableData || {}).length}\n`;
    } else {
      results += `Error: ${debugResult.data?.error || debugResult.error}\n`;
    }
    results += '\n';

    // Test 2: List whiteboards
    results += '📋 Test 2: List Whiteboards\n';
    const listResult = await testAPI(`/api/classroom/${classroomSlug}/whiteboard?session_id=${sessionId}`);
    results += `Status: ${listResult.status}\n`;
    results += `Success: ${listResult.ok}\n`;
    if (listResult.ok) {
      results += `Whiteboards found: ${Array.isArray(listResult.data) ? listResult.data.length : 0}\n`;
    } else {
      results += `Error: ${listResult.data?.error || listResult.error}\n`;
    }
    results += '\n';

    // Test 3: Create whiteboard (only if previous tests pass)
    if (listResult.ok) {
      results += '✨ Test 3: Create Whiteboard\n';
      const createResult = await testAPI(
        `/api/classroom/${classroomSlug}/whiteboard`,
        'POST',
        {
          session_id: sessionId,
          title: `Test Whiteboard ${new Date().toISOString()}`
        }
      );
      results += `Status: ${createResult.status}\n`;
      results += `Success: ${createResult.ok}\n`;
      if (createResult.ok) {
        results += `Created whiteboard ID: ${createResult.data.id}\n`;
        
        // Test 4: Get whiteboard events
        results += '\n🎯 Test 4: Get Whiteboard Events\n';
        const eventsResult = await testAPI(
          `/api/classroom/${classroomSlug}/whiteboard/${createResult.data.id}/events`
        );
        results += `Status: ${eventsResult.status}\n`;
        results += `Success: ${eventsResult.ok}\n`;
        if (eventsResult.ok) {
          results += `Events found: ${Array.isArray(eventsResult.data) ? eventsResult.data.length : 0}\n`;
        } else {
          results += `Error: ${eventsResult.data?.error || eventsResult.error}\n`;
        }
      } else {
        results += `Error: ${createResult.data?.error || createResult.error}\n`;
      }
      results += '\n';
    }

    // Test 5: Auth check
    results += '🔐 Test 5: Auth Check\n';
    const authResult = await testAPI('/api/auth/me');
    results += `Status: ${authResult.status}\n`;
    results += `Success: ${authResult.ok}\n`;
    if (authResult.ok) {
      results += `User role: ${authResult.data.role}\n`;
      results += `User ID: ${authResult.data.id}\n`;
    } else {
      results += `Error: ${authResult.data?.error || authResult.error}\n`;
    }

    setTestResult(results);
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Whiteboard System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Session ID:</label>
              <Input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-20 h-8"
              />
            </div>
            <Button 
              onClick={runTests} 
              disabled={isLoading}
              className="h-8"
            >
              {isLoading ? 'Testing...' : 'Run Tests'}
            </Button>
          </div>

          {testResult && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {testResult}
              </pre>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>What this tests:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Database table access and schema validation</li>
              <li>Authentication and user permissions</li>
              <li>Whiteboard CRUD operations</li>
              <li>Event system functionality</li>
              <li>API endpoint responses and error handling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

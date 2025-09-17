// 简化的视频处理队列测试脚本
const fetch = require('node-fetch');

// 本地QStash配置
const QSTASH_URL = 'http://127.0.0.1:8080';
const QSTASH_TOKEN = 'eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=';
const LOCAL_SERVER = 'http://localhost:3000';

async function testSimpleQueue() {
  console.log('🧪 测试QStash基本功能...\n');

  try {
    // 1. 测试简单的echo端点
    console.log('1️⃣ 测试发送简单消息...');
    
    const testPayload = {
      message: 'Hello QStash!',
      timestamp: new Date().toISOString(),
      test: true
    };

    // 发送到一个简单的测试端点
    const response = await fetch(`${QSTASH_URL}/v2/publish/https://httpbin.org/post`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Method': 'POST'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ 消息发送成功!');
      console.log('📋 消息ID:', result.messageId);
    } else {
      console.log('❌ 消息发送失败:', response.status);
      console.log('错误:', await response.text());
    }

    // 2. 查看队列状态
    console.log('\n2️⃣ 查看队列状态...');
    const messagesResponse = await fetch(`${QSTASH_URL}/v2/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`
      }
    });

    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      console.log('📊 队列中的消息:', messages.length, '条');
      
      if (messages.length > 0) {
        console.log('最新消息:');
        messages.slice(0, 3).forEach((msg, index) => {
          console.log(`   ${index + 1}. ID: ${msg.messageId}`);
          console.log(`      URL: ${msg.url}`);
          console.log(`      状态: ${msg.state}`);
          console.log(`      创建时间: ${new Date(msg.createdAt).toLocaleString()}`);
        });
      }
    }

    // 3. 测试本地视频处理端点连接
    console.log('\n3️⃣ 测试本地API端点连接...');
    
    const endpoints = [
      '/api/video-processing/steps/compress',
      '/api/video-processing/steps/audio-convert', 
      '/api/video-processing/steps/transcribe',
      '/api/video-processing/steps/embed'
    ];

    for (const endpoint of endpoints) {
      try {
        const testResponse = await fetch(`${LOCAL_SERVER}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'upstash-signature': 'test-signature'
          },
          body: JSON.stringify({
            queue_id: 999,
            attachment_id: 123,
            user_id: 'test-user-id',
            transcription_text: 'test text'
          })
        });

        console.log(`   ${endpoint}: ${testResponse.status === 401 ? '✅ 端点存在 (需要认证)' : testResponse.status === 200 ? '✅ 端点正常' : '❌ 端点异常'}`);
      } catch (error) {
        console.log(`   ${endpoint}: ❌ 连接失败 - ${error.message}`);
      }
    }

    console.log('\n🎯 测试完成!');
    console.log('\n📝 下一步建议:');
    console.log('   1. 确保Next.js服务器在 http://localhost:3000 运行');
    console.log('   2. 在.env.local中添加本地QStash配置');
    console.log('   3. 尝试上传真实视频文件测试完整流程');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testSimpleQueue();

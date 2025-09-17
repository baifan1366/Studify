// QStash本地测试脚本
const fetch = require('node-fetch');

// 本地QStash配置
const QSTASH_URL = 'http://127.0.0.1:8080';
const QSTASH_TOKEN = 'eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=';
const LOCAL_SERVER = 'http://localhost:3000';

async function testQStashQueue() {
  console.log('🚀 开始测试QStash视频处理队列...\n');

  try {
    // 1. 测试QStash健康状态
    console.log('1️⃣ 检查QStash服务状态...');
    const healthResponse = await fetch(`${QSTASH_URL}/v2/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`
      }
    });
    
    if (healthResponse.ok) {
      console.log('✅ QStash服务运行正常');
    } else {
      console.log('❌ QStash服务异常:', healthResponse.status);
      return;
    }

    // 2. 测试发送消息到视频压缩步骤
    console.log('\n2️⃣ 测试发送压缩任务到队列...');
    const compressJobPayload = {
      queue_id: 999,
      attachment_id: 123,
      user_id: 'test-user-id',
      timestamp: new Date().toISOString()
    };

    const compressResponse = await fetch(`${QSTASH_URL}/v2/publish/${LOCAL_SERVER}/api/video-processing/steps/compress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Method': 'POST',
        'Upstash-Retries': '3',
        'Upstash-Delay': '10s'
      },
      body: JSON.stringify(compressJobPayload)
    });

    if (compressResponse.ok) {
      const compressResult = await compressResponse.json();
      console.log('✅ 压缩任务已发送到队列');
      console.log('📋 消息ID:', compressResult.messageId);
    } else {
      console.log('❌ 发送压缩任务失败:', compressResponse.status);
      console.log('错误详情:', await compressResponse.text());
    }

    // 3. 测试发送消息到音频转换步骤
    console.log('\n3️⃣ 测试发送音频转换任务到队列...');
    const audioJobPayload = {
      queue_id: 999,
      attachment_id: 123,
      user_id: 'test-user-id',
      timestamp: new Date().toISOString()
    };

    const audioResponse = await fetch(`${QSTASH_URL}/v2/publish/${LOCAL_SERVER}/api/video-processing/steps/audio-convert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Method': 'POST',
        'Upstash-Retries': '3',
        'Upstash-Delay': '15s'
      },
      body: JSON.stringify(audioJobPayload)
    });

    if (audioResponse.ok) {
      const audioResult = await audioResponse.json();
      console.log('✅ 音频转换任务已发送到队列');
      console.log('📋 消息ID:', audioResult.messageId);
    } else {
      console.log('❌ 发送音频转换任务失败:', audioResponse.status);
    }

    // 4. 测试发送消息到转录步骤
    console.log('\n4️⃣ 测试发送转录任务到队列...');
    const transcribeJobPayload = {
      queue_id: 999,
      attachment_id: 123,
      user_id: 'test-user-id',
      timestamp: new Date().toISOString()
    };

    const transcribeResponse = await fetch(`${QSTASH_URL}/v2/publish/${LOCAL_SERVER}/api/video-processing/steps/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Method': 'POST',
        'Upstash-Retries': '3',
        'Upstash-Delay': '20s'
      },
      body: JSON.stringify(transcribeJobPayload)
    });

    if (transcribeResponse.ok) {
      const transcribeResult = await transcribeResponse.json();
      console.log('✅ 转录任务已发送到队列');
      console.log('📋 消息ID:', transcribeResult.messageId);
    } else {
      console.log('❌ 发送转录任务失败:', transcribeResponse.status);
    }

    // 5. 测试发送消息到嵌入生成步骤
    console.log('\n5️⃣ 测试发送嵌入生成任务到队列...');
    const embedJobPayload = {
      queue_id: 999,
      attachment_id: 123,
      user_id: 'test-user-id',
      transcription_text: 'This is a test transcription for embedding generation.',
      timestamp: new Date().toISOString()
    };

    const embedResponse = await fetch(`${QSTASH_URL}/v2/publish/${LOCAL_SERVER}/api/video-processing/steps/embed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Method': 'POST',
        'Upstash-Retries': '3',
        'Upstash-Delay': '30s'
      },
      body: JSON.stringify(embedJobPayload)
    });

    if (embedResponse.ok) {
      const embedResult = await embedResponse.json();
      console.log('✅ 嵌入生成任务已发送到队列');
      console.log('📋 消息ID:', embedResult.messageId);
    } else {
      console.log('❌ 发送嵌入生成任务失败:', embedResponse.status);
    }

    // 6. 查看队列中的消息
    console.log('\n6️⃣ 查看队列中的消息...');
    const messagesResponse = await fetch(`${QSTASH_URL}/v2/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${QSTASH_TOKEN}`
      }
    });

    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      console.log('📊 队列中的消息数量:', messages.length);
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ID: ${msg.messageId}, URL: ${msg.url}, 状态: ${msg.state}`);
      });
    } else {
      console.log('❌ 获取队列消息失败:', messagesResponse.status);
    }

    console.log('\n🎉 QStash队列测试完成！');
    console.log('\n💡 提示:');
    console.log('   - 确保你的Next.js开发服务器在 http://localhost:3000 运行');
    console.log('   - 检查控制台日志查看消息处理情况');
    console.log('   - 消息会根据设置的延迟时间依次执行');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testQStashQueue();

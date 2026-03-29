/**
 * AI API 代理接口
 * 解决前端直接调用外部 AI API 时的 CORS 问题
 * 前端将请求发送到此接口，由此接口转发到实际的 AI 服务商
 */

module.exports = async (req, res) => {
    // CORS 头部
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { endpoint, apiKey, model, messages, temperature, max_tokens } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: '缺少 endpoint 参数' });
        }
        if (!apiKey) {
            return res.status(400).json({ error: '缺少 apiKey 参数' });
        }
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: '缺少或格式错误的 messages 参数' });
        }

        const requestBody = {
            model: model || 'gpt-3.5-turbo',
            messages,
            temperature: temperature ?? 0.7,
            max_tokens: max_tokens ?? 4000
        };

        // 根据 endpoint 判断是否是 Anthropic，构建对应 headers
        const isAnthropic = endpoint.includes('anthropic.com');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (isAnthropic) {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.error?.message || `AI API 请求失败: ${response.status}`,
                details: data
            });
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error('AI proxy error:', err);
        return res.status(500).json({ error: '代理请求失败: ' + err.message });
    }
};

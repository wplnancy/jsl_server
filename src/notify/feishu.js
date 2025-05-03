const sendMessage = async (content) => {
  const response = await fetch(
    'https://open.feishu.cn/open-apis/bot/v2/hook/2e96af9c-1d54-45ce-96a0-05c6248be63e',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg_type: 'text',
        content: {
          text: content,
        },
      }),
    },
  );
  return await response.json();
};

export default sendMessage;

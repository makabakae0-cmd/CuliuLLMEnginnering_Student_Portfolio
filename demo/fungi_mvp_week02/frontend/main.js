const checkBtn = document.getElementById('check-btn');
const result = document.getElementById('result');
const backendUrlInput = document.getElementById('backend-url');

checkBtn.addEventListener('click', async () => {
  const base = backendUrlInput.value.trim().replace(/\/$/, '');
  const url = `${base}/api/health`;

  result.textContent = '请求中...';
  try {
    const res = await fetch(url);
    const data = await res.json();
    result.textContent = JSON.stringify({ statusCode: res.status, data }, null, 2);
  } catch (err) {
    result.textContent = `请求失败: ${err.message}`;
  }
});

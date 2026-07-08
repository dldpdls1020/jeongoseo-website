module.exports = async (req, res) => {
  const { code, error } = req.query;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (error) {
    res.status(400).send(renderScript({ error }, true));
    return;
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await tokenRes.json();

    if (data.error) {
      res.status(400).send(renderScript(data, true));
      return;
    }

    res.status(200).send(renderScript({ token: data.access_token, provider: 'github' }, false));
  } catch (e) {
    res.status(500).send(renderScript({ error: 'token_exchange_failed' }, true));
  }
};

function renderScript(payload, isError) {
  const type = isError ? 'error' : 'success';
  const message = `authorization:github:${type}:${JSON.stringify(payload)}`;
  return `<!doctype html><html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;
}

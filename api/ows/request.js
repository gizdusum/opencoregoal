module.exports = async (req, res) => {
  const upstream = process.env.OPENCOREGOAL_UPSTREAM_URL || 'http://187.124.91.33:8787';

  try {
    const response = await fetch(`${upstream}/api/ows/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body || {})
    });
    const text = await response.text();

    res.statusCode = response.status;
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json; charset=utf-8');
    res.end(text);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Failed to reach upstream OWS backend.',
        detail: error.message
      })
    );
  }
};

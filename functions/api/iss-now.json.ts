export const onRequestGet: PagesFunction = async () => {
  const res = await fetch('http://api.open-notify.org/iss-now.json');
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

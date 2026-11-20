export function allowed(req) {
  const code = process.env.ACCESS_CODE;
  return Boolean(code) && req.headers.get("x-code") === code;
}

export function isAdmin(req) {
  const a = process.env.ADMIN_CODE;
  return Boolean(a) && req.headers.get("x-admin") === a;
}

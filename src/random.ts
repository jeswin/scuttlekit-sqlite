export function randomString() {
  const length = 31;
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  var result = "";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return "n" + result;
}

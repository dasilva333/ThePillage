decrypt = function(g, h) {
  sbox = new Array(255);
  mykey = new Array(255);
  for(var d = [], c = g.substr(0, 2) == "0x" ? 2 : 0;c < g.length;) {
    d.push(parseInt(g.substr(c, 2), 16));
    c += 2
  }
  c = [];
  for(var a = 0;a < h.length;) {
    c.push(h.charCodeAt(a));
    ++a
  }
  a = 0;
  for(var f = c.length, b = 0;b <= 255;) {
    mykey[b] = c[b % f];
    sbox[b] = b;
    ++b
  }
  for(b = 0;b <= 255;) {
    a = (a + sbox[b] + mykey[b]) % 256;
    c = sbox[b];
    sbox[b] = sbox[a];
    sbox[a] = c;
    ++b
  }
  b = a = 0;
  c = [];
  var e;
  for(f = 0;f < d.length;) {
    a = (a + 1) % 256;
    b = (b + sbox[a]) % 256;
    e = sbox[a];
    sbox[a] = sbox[b];
    sbox[b] = e;
    e = sbox[(sbox[a] + sbox[b]) % 256];
    e = d[f] ^ e;
    c.push(e);
    ++f
  }
  d = "";
  for(a = 0;a < c.length;) {
    d += String.fromCharCode(c[a]);
    ++a
  }
  return d
};
window['decrypt'] = decrypt;
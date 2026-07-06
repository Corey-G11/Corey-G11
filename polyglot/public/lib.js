// Pure, dependency-free helpers: a minimal ZIP writer and a small syntax
// highlighter. No DOM access here so the logic can be unit-tested in Node.
// Exposed as window.PolyglotLib for the browser app.
(function (root) {
  "use strict";

  /* ---------------- CRC-32 ---------------- */

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  /* ---------------- ZIP (store / no compression) ----------------
     Enough of the ZIP spec to produce a valid archive that any unzip
     tool reads: local file headers + central directory + end record. */

  function buildZip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;

    const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
    const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

    for (const file of files) {
      const nameBytes = enc.encode(file.name);
      const data = enc.encode(file.content);
      const crc = crc32(data);
      const size = data.length;

      // Local file header
      const local = [
        ...u32(0x04034b50), // signature
        ...u16(20), // version needed
        ...u16(0), // flags
        ...u16(0), // method = store
        ...u16(0), // mod time
        ...u16(0), // mod date
        ...u32(crc),
        ...u32(size), // compressed size
        ...u32(size), // uncompressed size
        ...u16(nameBytes.length),
        ...u16(0), // extra length
      ];
      chunks.push(Uint8Array.from(local), nameBytes, data);

      // Central directory record (written after all files)
      central.push([
        ...u32(0x02014b50), // signature
        ...u16(20), // version made by
        ...u16(20), // version needed
        ...u16(0), // flags
        ...u16(0), // method
        ...u16(0), // mod time
        ...u16(0), // mod date
        ...u32(crc),
        ...u32(size),
        ...u32(size),
        ...u16(nameBytes.length),
        ...u16(0), // extra length
        ...u16(0), // comment length
        ...u16(0), // disk number start
        ...u16(0), // internal attrs
        ...u32(0), // external attrs
        ...u32(offset), // local header offset
        ...nameBytes,
      ]);

      offset += local.length + nameBytes.length + size;
    }

    const centralStart = offset;
    let centralSize = 0;
    for (const rec of central) {
      const arr = Uint8Array.from(rec);
      chunks.push(arr);
      centralSize += arr.length;
    }

    const eocd = [
      ...u32(0x06054b50), // end of central directory signature
      ...u16(0), // disk number
      ...u16(0), // disk with central dir
      ...u16(files.length), // entries this disk
      ...u16(files.length), // entries total
      ...u32(centralSize),
      ...u32(centralStart),
      ...u16(0), // comment length
    ];
    chunks.push(Uint8Array.from(eocd));

    // Concatenate all chunks into one Uint8Array.
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    for (const c of chunks) {
      out.set(c, p);
      p += c.length;
    }
    return out;
  }

  /* ---------------- Syntax highlighting ---------------- */

  const KEYWORDS = new Set(
    (
      "if else elif for while do switch case default break continue return " +
      "function func def fn lambda class struct enum interface trait impl module " +
      "public private protected internal static final const let var val mutable new delete " +
      "try catch except finally throw throws raise ensure rescue " +
      "import from export package use using namespace require include extends implements " +
      "super this self async await yield defer go select chan map range " +
      "void int long short float double bool boolean byte char string str object any " +
      "in is and or not of as with match when where then begin end unless until loop " +
      "print println echo puts type typeof instanceof sizeof"
    ).split(/\s+/)
  );

  const LITERALS = new Set(
    "true false null nil none undefined True False None NULL".split(/\s+/)
  );

  const HASH_COMMENT = new Set(
    "python py ruby rb bash sh shell zsh perl r yaml yml toml makefile make " +
      "elixir ex powershell ps1 ini conf dockerfile".split(/\s+/)
  );
  const DASH_COMMENT = new Set("sql lua haskell hs elm ada".split(/\s+/));
  const MARKUP = new Set("html xml svg xhtml vue markdown md".split(/\s+/));

  function esc(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Returns HTML-safe, span-wrapped code. Falls back to escaped text on any error.
  function highlightCode(code, lang) {
    try {
      const l = (lang || "").toLowerCase();
      const escaped = esc(code);

      const commentParts = [];
      if (MARKUP.has(l)) {
        commentParts.push("&lt;!--[\\s\\S]*?--&gt;");
      } else if (HASH_COMMENT.has(l)) {
        commentParts.push("#[^\\n]*");
      } else if (DASH_COMMENT.has(l)) {
        commentParts.push("--[^\\n]*", "/\\*[\\s\\S]*?\\*/"); // lua also has --[[ ]] but keep simple
      } else if (l === "css" || l === "scss" || l === "less") {
        commentParts.push("/\\*[\\s\\S]*?\\*/");
      } else {
        commentParts.push("//[^\\n]*", "/\\*[\\s\\S]*?\\*/");
      }
      const commentRe = commentParts.join("|");

      // Ordered alternation: comments, strings, numbers, words.
      const master = new RegExp(
        "(" + commentRe + ")" + // 1 comment
          "|(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`)" + // 2 string
          "|(\\b0[xX][0-9a-fA-F]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)" + // 3 number
          "|([A-Za-z_$][A-Za-z0-9_$]*)", // 4 word
        "g"
      );

      return escaped.replace(master, (m, comment, str, num, word) => {
        if (comment !== undefined) return `<span class="tok-comment">${comment}</span>`;
        if (str !== undefined) return `<span class="tok-string">${str}</span>`;
        if (num !== undefined) return `<span class="tok-number">${num}</span>`;
        if (word !== undefined) {
          if (LITERALS.has(word)) return `<span class="tok-literal">${word}</span>`;
          if (KEYWORDS.has(word)) return `<span class="tok-keyword">${word}</span>`;
          return word;
        }
        return m;
      });
    } catch {
      return esc(code);
    }
  }

  root.PolyglotLib = { crc32, buildZip, highlightCode };
})(typeof window !== "undefined" ? window : globalThis);

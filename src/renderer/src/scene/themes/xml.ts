// Ported from Prozzta/guppyos 02d0d50b (MIT).
// A small, strict XML reader for Tiled files (.tmx / .tsx).
//
// Theme packs are parsed in the renderer AND in node:test, where there is no
// DOMParser, so the parser is plain TypeScript. It reads elements, attributes,
// text, comments, CDATA, processing instructions and the five predefined
// entities plus numeric character references. Anything malformed (an unclosed
// or mismatched tag, a bad attribute) throws an Error with the offset, which
// the pack loader turns into a diagnostic.

export interface XmlElement {
  tag: string;
  attrs: Record<string, string>;
  children: XmlElement[];
  /** Concatenated character data directly inside this element. */
  text: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s: string, at: number): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) throw new Error(`bad character reference ${m} near offset ${at}`);
      return String.fromCodePoint(code);
    }
    if (!(e in ENTITIES)) throw new Error(`unknown entity ${m} near offset ${at}`);
    return ENTITIES[e];
  });
}

const NAME = /[A-Za-z_:][-A-Za-z0-9_:.]*/y;

/** Parse an XML document and return its root element. */
export function parseXml(src: string): XmlElement {
  let i = 0;
  const n = src.length;
  const fail = (msg: string): never => { throw new Error(`${msg} at offset ${i}`); };
  const skipWs = () => { while (i < n && /\s/.test(src[i])) i++; };
  const readName = (): string => {
    NAME.lastIndex = i;
    const m = NAME.exec(src);
    if (!m) fail('expected a name');
    i += m![0].length;
    return m![0];
  };
  const stack: XmlElement[] = [];
  let root: XmlElement | null = null;
  if (src.charCodeAt(0) === 0xfeff) i = 1;
  while (i < n) {
    if (src.startsWith('<?', i)) {
      const e = src.indexOf('?>', i + 2);
      if (e < 0) fail('unclosed processing instruction');
      i = e + 2;
    } else if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4);
      if (e < 0) fail('unclosed comment');
      i = e + 3;
    } else if (src.startsWith('<![CDATA[', i)) {
      const e = src.indexOf(']]>', i + 9);
      if (e < 0) fail('unclosed CDATA');
      if (!stack.length) fail('CDATA outside the root element');
      stack[stack.length - 1].text += src.slice(i + 9, e);
      i = e + 3;
    } else if (src.startsWith('<!', i)) {
      const e = src.indexOf('>', i + 2);
      if (e < 0) fail('unclosed declaration');
      i = e + 1;
    } else if (src.startsWith('</', i)) {
      i += 2;
      const name = readName();
      skipWs();
      if (src[i] !== '>') fail(`expected > after </${name}`);
      i++;
      const top = stack.pop();
      if (!top || top.tag !== name) fail(`mismatched closing tag </${name}>`);
    } else if (src[i] === '<') {
      i++;
      const el: XmlElement = { tag: readName(), attrs: {}, children: [], text: '' };
      const parent = stack[stack.length - 1];
      if (parent) parent.children.push(el);
      else if (root) fail('more than one root element');
      else root = el;
      for (;;) {
        skipWs();
        if (src.startsWith('/>', i)) { i += 2; break; }
        if (src[i] === '>') { i++; stack.push(el); break; }
        if (i >= n) fail(`unclosed tag <${el.tag}>`);
        const an = readName();
        skipWs();
        if (src[i] !== '=') fail(`attribute ${an} has no value`);
        i++;
        skipWs();
        const q = src[i];
        if (q !== '"' && q !== "'") fail(`attribute ${an} is not quoted`);
        const e = src.indexOf(q, i + 1);
        if (e < 0) fail(`unclosed attribute ${an}`);
        el.attrs[an] = decodeEntities(src.slice(i + 1, e), i);
        i = e + 1;
      }
    } else {
      const e = src.indexOf('<', i);
      const end = e < 0 ? n : e;
      const raw = src.slice(i, end);
      if (stack.length) stack[stack.length - 1].text += decodeEntities(raw, i);
      else if (raw.trim()) fail('text outside the root element');
      i = end;
    }
  }
  if (stack.length) throw new Error(`unclosed element <${stack[stack.length - 1].tag}> at end of input`);
  if (!root) throw new Error('no root element');
  return root;
}

/** The element's direct children with this tag name. */
export function childrenOf(el: XmlElement, tag: string): XmlElement[] {
  return el.children.filter((c) => c.tag === tag);
}

/** The element's first direct child with this tag name. */
export function childOf(el: XmlElement, tag: string): XmlElement | undefined {
  return el.children.find((c) => c.tag === tag);
}

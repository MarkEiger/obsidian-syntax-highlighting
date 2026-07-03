/** @type {import('./lexer-api').Lexer} */

// ============================================================================
// A context-aware x86/x64 lexer. Two stages:
//   1. scan()          — char-by-char scanner producing raw lexemes
//   2. classifyLine()  — a per-line parser that reads those lexemes WITH
//                        grammar context (disasm prologue? label? prefix?
//                        mnemonic? operands?) and validates structure.
// Tolerant of hand-written NASM and disassembly pasted from IDA, gdb/pwndbg
// (incl. AT&T %reg/$imm and b/w/l/q suffixes), WinDbg, objdump, radare2,
// Ghidra, godbolt/gas, ...
// ============================================================================

// ---- registers ----------------------------------------------------------
const REGISTERS = (() => {
  const r = new Set();
  ['ax', 'bx', 'cx', 'dx', 'si', 'di', 'sp', 'bp'].forEach(x => { r.add(x); r.add('e' + x); r.add('r' + x); });
  ['a', 'b', 'c', 'd'].forEach(x => { r.add(x + 'l'); r.add(x + 'h'); });
  ['si', 'di', 'sp', 'bp'].forEach(x => r.add(x + 'l'));
  for (let n = 8; n <= 15; n++) { r.add('r' + n); ['b', 'w', 'd'].forEach(s => r.add('r' + n + s)); }
  ['ip', 'eip', 'rip', 'cs', 'ds', 'es', 'fs', 'gs', 'ss', 'flags', 'eflags', 'rflags', 'st'].forEach(x => r.add(x));
  for (let n = 0; n <= 7; n++) { r.add('st' + n); r.add('mm' + n); r.add('dr' + n); r.add('k' + n); }
  for (let n = 0; n <= 8; n++) r.add('cr' + n);
  for (let n = 0; n <= 31; n++) { r.add('xmm' + n); r.add('ymm' + n); r.add('zmm' + n); }
  return r;
})();

const SIZES = new Set(['byte', 'word', 'dword', 'qword', 'tbyte', 'tword', 'oword', 'yword', 'zword',
  'ptr', 'short', 'near', 'far', 'rel', 'strict', 'offset', 'abs']);

const PREFIXES = new Set(['rep', 'repe', 'repne', 'repz', 'repnz', 'lock', 'bnd', 'notrack', 'data16', 'rex', 'rex.w']);

const DIRECTIVES = new Set(['section', 'segment', 'global', 'globl', 'extern', 'export', 'import', 'common',
  'static', 'public', 'db', 'dw', 'dd', 'dq', 'dt', 'do', 'dy', 'dz',
  'resb', 'resw', 'resd', 'resq', 'rest', 'reso', 'resy', 'resz',
  'incbin', 'equ', 'times', 'align', 'alignb', 'struc', 'endstruc', 'istruc', 'iend', 'at',
  'org', 'bits', 'use16', 'use32', 'use64', 'default', 'cpu', 'float', 'absolute',
  'proc', 'endp', 'ends', 'end', 'assume', 'invoke', 'include', 'includelib', 'label', 'byte']);

// directives that may follow a bare (colon-less) NASM data label: `msg db "hi"`
const DATA_DIRECTIVES = new Set(['db', 'dw', 'dd', 'dq', 'dt', 'do', 'dy', 'dz',
  'resb', 'resw', 'resd', 'resq', 'rest', 'reso', 'resy', 'resz', 'equ', 'times']);

// ---- mnemonics with operand arity [min,max] (the validated core) --------
const ARITY = {
  mov: [2, 2], movabs: [2, 2], lea: [2, 2], push: [1, 1], pop: [1, 1],
  add: [2, 2], sub: [2, 2], adc: [2, 2], sbb: [2, 2], and: [2, 2], or: [2, 2], xor: [2, 2],
  cmp: [2, 2], test: [2, 2], xchg: [2, 2], xadd: [2, 2], cmpxchg: [2, 2],
  inc: [1, 1], dec: [1, 1], neg: [1, 1], not: [1, 1],
  mul: [1, 1], imul: [1, 3], div: [1, 1], idiv: [1, 1],
  shl: [1, 2], shr: [1, 2], sal: [1, 2], sar: [1, 2], rol: [1, 2], ror: [1, 2], rcl: [1, 2], rcr: [1, 2],
  shld: [3, 3], shrd: [3, 3],
  bt: [2, 2], bts: [2, 2], btr: [2, 2], btc: [2, 2], bsf: [2, 2], bsr: [2, 2],
  movzx: [2, 2], movsx: [2, 2], movsxd: [2, 2], popcnt: [2, 2], lzcnt: [2, 2], tzcnt: [2, 2],
  call: [1, 1], jmp: [1, 1], jcxz: [1, 1], jecxz: [1, 1], jrcxz: [1, 1],
  ret: [0, 1], retn: [0, 1], retf: [0, 1], iret: [0, 0], iretd: [0, 0], iretq: [0, 0],
  loop: [1, 1], loope: [1, 1], loopne: [1, 1], loopz: [1, 1], loopnz: [1, 1],
  int: [1, 1], enter: [2, 2], in: [2, 2], out: [2, 2], bswap: [1, 1],
  nop: [0, 1], leave: [0, 0], hlt: [0, 0], cpuid: [0, 0], syscall: [0, 0], sysret: [0, 0],
  sysenter: [0, 0], sysexit: [0, 0], ud2: [0, 0], int3: [0, 0], int1: [0, 0], pause: [0, 0],
  cld: [0, 0], std: [0, 0], cli: [0, 0], sti: [0, 0], clc: [0, 0], stc: [0, 0], cmc: [0, 0],
  lahf: [0, 0], sahf: [0, 0], rdtsc: [0, 0], rdtscp: [0, 0], rdrand: [1, 1], rdseed: [1, 1],
  cbw: [0, 0], cwde: [0, 0], cdqe: [0, 0], cwd: [0, 0], cdq: [0, 0], cqo: [0, 0],
  endbr64: [0, 0], endbr32: [0, 0],
  pushf: [0, 0], popf: [0, 0], pushfq: [0, 0], popfq: [0, 0], pushfd: [0, 0], popfd: [0, 0],
  pusha: [0, 0], popa: [0, 0], pushad: [0, 0], popad: [0, 0],
  lfence: [0, 0], mfence: [0, 0], sfence: [0, 0],
};
// condition-code families
'o no b c nae ae nb nc e z ne nz be na a nbe s ns p pe np po l nge ge nl le ng g nle'
  .split(' ').forEach(cc => { ARITY['j' + cc] = [1, 1]; ARITY['set' + cc] = [1, 1]; ARITY['cmov' + cc] = [2, 2]; });

// recognized (coloured) but not arity-checked — SSE/AVX/x87/string/system,
// where forms vary or dialects clash (e.g. movsd string vs SSE)
const EXTRA = ('movsb movsw movsd movsq stosb stosw stosd stosq lodsb lodsw lodsd lodsq ' +
  'scasb scasw scasd scasq cmpsb cmpsw cmpsd cmpsq ' +
  'fld fst fstp fild fist fistp fadd faddp fsub fsubp fsubr fmul fmulp fdiv fdivp fdivr ' +
  'fabs fchs fcom fcomp fcompp fucom fucomp fucompp fxch fldz fld1 fldpi fldl2e fldl2t fldlg2 fldln2 ' +
  'fsqrt fsin fcos fptan fpatan fninit finit fwait fnstsw fstsw fnstcw fldcw fnclex fxam frndint ' +
  'movaps movups movapd movupd movss movd movq movdqa movdqu movntdq movntps lddqu ' +
  'addps addpd addss addsd subps subpd subss subsd mulps mulpd mulss mulsd divps divpd divss divsd ' +
  'sqrtps sqrtpd sqrtss sqrtsd minps minpd minss minsd maxps maxpd maxss maxsd rcpps rsqrtps ' +
  'andps andpd andnps andnpd orps orpd xorps xorpd ' +
  'pand pandn por pxor paddb paddw paddd paddq psubb psubw psubd psubq pmullw pmulld pmuludq pmaddwd ' +
  'pcmpeqb pcmpeqw pcmpeqd pcmpgtb pcmpgtw pcmpgtd pshufd pshufb pshufw pshuflw pshufhw ' +
  'punpcklbw punpckhbw punpcklwd punpckhwd punpckldq punpckhdq punpcklqdq punpckhqdq ' +
  'unpcklps unpckhps unpcklpd unpckhpd shufps shufpd blendvps blendvpd pblendvb ' +
  'pmovmskb movmskps movmskpd pinsrb pinsrw pinsrd pinsrq pextrb pextrw pextrd pextrq ' +
  'pslld psrld psllq psrlq psllw psrlw psrad psraw pslldq psrldq ' +
  'cvtsi2ss cvtsi2sd cvtss2si cvtsd2si cvttss2si cvttsd2si cvtss2sd cvtsd2ss cvtdq2ps cvtps2dq cvttps2dq ' +
  'comiss comisd ucomiss ucomisd ptest pxor movhlps movlhps movhps movlps maskmovdqu ' +
  'vzeroupper vzeroall clflush clflushopt prefetcht0 prefetcht1 prefetcht2 prefetchnta ' +
  'monitor mwait xgetbv xsetbv rdmsr wrmsr rdpmc invlpg invd wbinvd ' +
  'lgdt sgdt lidt sidt ltr str lldt sldt lmsw smsw clac stac clts ' +
  'adcx adox mulx bzhi pdep pext andn blsr blsi blsmsk sarx shlx shrx rorx bextr ' +
  'xlat xlatb xacquire xrelease xbegin xend xabort xtest crc32 ' +
  'aesenc aesenclast aesdec aesdeclast aeskeygenassist pclmulqdq ' +
  'wait fnop f2xm1 fyl2x fscale fxtract fprem fprem1 fdecstp fincstp ffree').split(/\s+/);

const MNEMONICS = new Set([...Object.keys(ARITY), ...EXTRA]);

// AT&T size suffix: try the word, else the word minus a trailing b/w/l/q
function baseMnemonic(w) {
  if (MNEMONICS.has(w)) return w;
  if (/[a-z](b|w|l|q)$/.test(w)) {
    const stripped = w.slice(0, -1);
    if (MNEMONICS.has(stripped)) return stripped;
  }
  return null;
}
const isRegister = w => REGISTERS.has(w.replace(/^%/, ''));
const isDirectiveWord = w => w[0] === '.' || w[0] === '%' || DIRECTIVES.has(w);
const isPureHex = s => /^[0-9a-f]+$/i.test(s);

// ---- stage 1: scanner ----------------------------------------------------
const WORD_RE = /%?[A-Za-z_.?@$][\w.?@$]*/y;
const NUM_RE = /\$?[0-9][0-9a-fx.ob]*h?/iy;

function scan(line) {
  const lex = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === ';' || c === '#') { lex.push({ k: 'comment', text: line.slice(i) }); break; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && line[j] !== c) j++;
      j = Math.min(j + 1, n);
      lex.push({ k: 'string', text: line.slice(i, j) });
      i = j; continue;
    }
    if (c === '<') { // gdb/pwndbg annotation <+4>, <main+8>, <printf@plt>
      const gt = line.indexOf('>', i + 1);
      if (gt !== -1) { lex.push({ k: 'annot', text: line.slice(i, gt + 1) }); i = gt + 1; continue; }
    }
    if (c === '`') { lex.push({ k: 'punct', text: '`' }); i++; continue; }
    if ('[](){}+-*:,=>|&~'.includes(c)) { lex.push({ k: 'punct', text: c }); i++; continue; }
    if (/[0-9]/.test(c) || (c === '$' && /[0-9]/.test(line[i + 1] || ''))) {
      NUM_RE.lastIndex = i;
      const m = NUM_RE.exec(line);
      if (m && m.index === i) { lex.push({ k: 'number', text: m[0] }); i = NUM_RE.lastIndex; continue; }
    }
    WORD_RE.lastIndex = i;
    const wm = WORD_RE.exec(line);
    if (wm && wm.index === i) { lex.push({ k: 'word', text: wm[0] }); i = WORD_RE.lastIndex; continue; }
    i++; // unknown char — skip so we can't loop forever
  }
  return lex;
}

// ---- stage 2: contextual line parser -------------------------------------
// Returns detailed tokens for a valid line, or a single {invalid} token
// spanning the whole line when structure is provably wrong.
function classifyLine(line) {
  const lex = scan(line);
  if (lex.length === 0) return [];

  const out = [];
  const emit = (lx, type) => out.push({ text: lx.text, type });
  let idx = 0;

  // -- disassembly prologue --------------------------------------------
  // IDA segment prefix: word ':' hexnumber   (.text:0040113C)
  if (lex[idx] && lex[idx].k === 'word'
      && lex[idx + 1] && lex[idx + 1].k === 'punct' && lex[idx + 1].text === ':'
      && lex[idx + 2] && lex[idx + 2].k === 'number' && isPureHex(lex[idx + 2].text)) {
    emit(lex[idx], 'address');
    emit(lex[idx + 2], 'address');
    idx += 3;
  }
  // gdb/pwndbg cursor markers (=>, ►, *) — skipped
  while (lex[idx] && lex[idx].k === 'punct' && '=>*-'.includes(lex[idx].text)) idx++;

  // leading address: 0x..., bare hex, or WinDbg high`low
  let hadAddress = false;
  if (lex[idx] && lex[idx].k === 'number' && (/^0x/i.test(lex[idx].text) || isPureHex(lex[idx].text))) {
    if (lex[idx + 1] && lex[idx + 1].k === 'punct' && lex[idx + 1].text === '`'
        && lex[idx + 2] && lex[idx + 2].k === 'number') {
      emit(lex[idx], 'address');
      emit(lex[idx + 2], 'address');
      idx += 3;
    } else {
      emit(lex[idx], 'address');
      idx++;
    }
    hadAddress = true;
    // trailing annotations (<+4>) and colons that belong to the address
    while (lex[idx] && (lex[idx].k === 'annot' || (lex[idx].k === 'punct' && lex[idx].text === ':'))) {
      if (lex[idx].k === 'annot') emit(lex[idx], 'address');
      idx++;
    }
  }
  // objdump / WinDbg opcode byte dump: even-length pure-hex runs before the mnemonic
  if (hadAddress) {
    while (lex[idx] && lex[idx].k === 'number' && isPureHex(lex[idx].text) && lex[idx].text.length % 2 === 0) {
      emit(lex[idx], 'bytes');
      idx++;
    }
  }

  // -- label ------------------------------------------------------------
  if (lex[idx] && lex[idx].k === 'word'
      && lex[idx + 1] && lex[idx + 1].k === 'punct' && lex[idx + 1].text === ':') {
    out.push({ text: lex[idx].text + ':', type: 'label' });
    idx += 2;
  } else if (lex[idx] && lex[idx].k === 'word'
      && lex[idx + 1] && lex[idx + 1].k === 'word' && DATA_DIRECTIVES.has(lex[idx + 1].text.toLowerCase())
      && !isRegister(lex[idx].text) && !baseMnemonic(lex[idx].text.toLowerCase())) {
    // NASM data label without a colon:  msg db "hi"
    out.push({ text: lex[idx].text, type: 'label' });
    idx++;
  }

  // -- instruction prefixes ---------------------------------------------
  while (lex[idx] && lex[idx].k === 'word' && PREFIXES.has(lex[idx].text.toLowerCase())) {
    emit(lex[idx], 'prefix');
    idx++;
  }

  // -- mnemonic / directive / unknown -----------------------------------
  let mnemonic = null;
  if (lex[idx] && lex[idx].k === 'word') {
    const w = lex[idx].text.toLowerCase();
    const base = baseMnemonic(w);
    if (base) { emit(lex[idx], 'mnemonic'); mnemonic = base; idx++; }
    else if (isDirectiveWord(w)) { emit(lex[idx], 'directive'); idx++; }
    else { emit(lex[idx], 'ident'); idx++; }
  }

  // -- operands + structural validation ---------------------------------
  let depth = 0;        // [] () nesting
  let commas = 0;       // top-level operand separators
  let sawOperand = false;
  let bad = false;
  for (; idx < lex.length; idx++) {
    const lx = lex[idx];
    if (lx.k === 'comment') { emit(lx, 'comment'); break; }
    if (lx.k === 'punct') {
      if (lx.text === '[' || lx.text === '(') depth++;
      else if (lx.text === ']' || lx.text === ')') { depth--; if (depth < 0) bad = true; }
      else if (lx.text === ',' && depth === 0) commas++;
      continue; // punctuation isn't coloured
    }
    if (lx.k === 'string') { emit(lx, 'string'); sawOperand = true; continue; }
    if (lx.k === 'number') { emit(lx, 'number'); sawOperand = true; continue; }
    if (lx.k === 'annot') { emit(lx, 'address'); sawOperand = true; continue; }
    if (lx.k === 'word') {
      const w = lx.text.toLowerCase();
      if (isRegister(w)) emit(lx, 'register');
      else if (SIZES.has(w)) emit(lx, 'size');
      else if (baseMnemonic(w)) { emit(lx, 'mnemonic'); if (mnemonic) bad = true; } // a 2nd instruction on the line
      else emit(lx, 'ident');
      sawOperand = true;
    }
  }
  if (depth !== 0) bad = true;
  if (mnemonic && ARITY[mnemonic]) {
    const count = sawOperand ? commas + 1 : 0;
    const [min, max] = ARITY[mnemonic];
    if (count < min || count > max) bad = true;
  }

  return bad ? [{ text: line, type: 'invalid' }] : out;
}

module.exports = {
  id: 'mark.nasm',
  version: 3,
  name: 'nasm',
  defaultExtension: 'nasm',

  // a cute dracula-ish palette
  requiredColours: [
    { name: 'Mnemonic Pink',   value: '#ff79c6' },
    { name: 'Register Cyan',   value: '#8be9fd' },
    { name: 'Number Peach',    value: '#ffb86c' },
    { name: 'String Sun',      value: '#f1fa8c' },
    { name: 'Comment Slate',   value: '#6272a4' },
    { name: 'Directive Grape', value: '#bd93f9' },
    { name: 'Label Mint',      value: '#50fa7b' },
    { name: 'Address Sky',     value: '#6fa8dc' },
    { name: 'Size Lilac',      value: '#d6acff' },
    { name: 'Ident Fog',       value: '#a9b1d6' },
    { name: 'Invalid Rose',    value: '#ff6e6e' },
  ],

  // many token types, curated colours (several types share a colour)
  colourMapping: {
    mnemonic:  'Mnemonic Pink',
    prefix:    'Mnemonic Pink',
    register:  'Register Cyan',
    number:    'Number Peach',
    string:    'String Sun',
    comment:   'Comment Slate',
    bytes:     'Comment Slate',
    directive: 'Directive Grape',
    label:     'Label Mint',
    address:   'Address Sky',
    size:      'Size Lilac',
    ident:     'Ident Fog',
    invalid:   'Invalid Rose',
  },

  tokenize(input) {
    const tokens = [];
    for (const line of input.split('\n')) {
      for (const t of classifyLine(line)) tokens.push(t);
    }
    return tokens;
  },
};
